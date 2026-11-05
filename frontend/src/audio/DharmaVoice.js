/**
 * CHÙA ONLINE 3D - Dharma Voice AI
 * (Microsoft Azure Neural Vietnamese TTS + Warm Baritone Temple Acoustics + Resilient Karaoke Engine)
 * Features:
 * - 4 selectable Voice Profiles (Thầy Trụ Trì Trầm Ấm, Sư Cô Thanh Nhã, Chú Tiểu Trong Trẻo, Đại Chúng Trang Nghiêm)
 * - Automatic strip of "(3 lần)" instruction text so TTS never reads the literal words "ba lần"
 * - Session-token guarded speech lifecycle so changing voice profiles, pausing, or stopping never triggers stale callbacks
 * - Pause & Resume support (`pause()`, `resume()`) from exact word boundary
 * - Automatic fallback to Web Speech API / timer for unsupported browsers, offline mode, or Node tests
 */

export const VOICE_PROFILES = [
  {
    id: 'SU_ONG_TRAM_AM',
    name: '🧔‍♂️ Thầy Trụ Trì (Trầm Ấm Neural)',
    rate: 0.78,
    pitch: 0.62,
    preferGender: 'male',
    warmthDb: 3.8,
    reverbWet: 0.17
  },
  {
    id: 'SU_CO_THANH_NHA',
    name: '👩‍🦰 Sư Cô (Thanh Nhã Neural)',
    rate: 0.86,
    pitch: 1.22,
    preferGender: 'female',
    warmthDb: 2.0,
    reverbWet: 0.15
  },
  {
    id: 'CHU_TIEU_TRONG_TREO',
    name: '👶 Chú Tiểu (Trong Trẻo)',
    rate: 0.95,
    pitch: 1.45,
    preferGender: 'female',
    warmthDb: 1.2,
    reverbWet: 0.12
  },
  {
    id: 'DAI_CHUNG_TRANG_NGHIEM',
    name: '☸️ Pháp Hội (Trang Nghiêm Neural)',
    rate: 0.82,
    pitch: 0.88,
    preferGender: 'any',
    warmthDb: 3.2,
    reverbWet: 0.22
  }
];

export class DharmaVoice {
  constructor() {
    this.synth =
      typeof window !== 'undefined' && 'speechSynthesis' in window
        ? window.speechSynthesis
        : null;
    this.enabled = true;
    this.isSpeaking = false;
    this.isPaused = false;
    this.preferredVoice = null;
    this.availableViVoices = [];
    this.currentProfileId = 'SU_ONG_TRAM_AM';

    this.currentUtterance = null;
    this.watchdogTimer = null;
    this.fallbackTimer = null;
    this.karaokeInterval = null;
    this.speakDelayTimer = null;

    // Monotonic session ID to invalidate stale utterance callbacks when switching voices or stopping
    this._speakSessionId = 0;

    // Web Audio API Neural TTS & Warm Hall Acoustic Chain
    this._audioCtx = null;
    this._reverbImpulse = null;
    this._currentSourceNode = null;
    this._currentAbortController = null;
    this._audioBufferCache = new Map();
    this._inflightPrefetch = new Map();

    // State for resuming after pause or mid-verse voice change
    this._activeText = '';
    this._activeOnEnd = null;
    this._activeOnWord = null;
    this._currentWordIdx = 0;

    this._initVoices();
  }

  _canUseNeuralTts() {
    if (typeof window === 'undefined') return false;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || typeof window.fetch !== 'function') return false;
    const proto = window.location?.protocol || '';
    return proto === 'http:' || proto === 'https:';
  }

  _ensureAudioContext() {
    if (!this._canUseNeuralTts()) return null;
    if (!this._audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this._audioCtx = new AudioCtx();
    }
    if (this._audioCtx.state === 'suspended') {
      this._audioCtx.resume().catch(() => {});
    }
    if (!this._reverbImpulse && this._audioCtx) {
      this._reverbImpulse = this._createHallImpulse(this._audioCtx, 1.45, 2.8);
    }
    return this._audioCtx;
  }

  _createHallImpulse(ctx, durationSec = 1.45, decay = 2.8) {
    try {
      const sampleRate = ctx.sampleRate || 44100;
      const length = Math.floor(sampleRate * durationSec);
      const impulse = ctx.createBuffer(2, length, sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const channelData = impulse.getChannelData(ch);
        let prev = 0;
        for (let i = 0; i < length; i++) {
          const t = i / length;
          const envelope = Math.pow(1 - t, decay);
          const white = Math.random() * 2 - 1;
          prev = prev * 0.72 + white * 0.28;
          channelData[i] = prev * envelope * 0.42;
        }
      }
      return impulse;
    } catch {
      return null;
    }
  }

  _initVoices() {
    if (!this.synth) return;

    const findVoice = () => {
      try {
        const voices = this.synth.getVoices() || [];
        this.availableViVoices = voices.filter(
          (v) =>
            v.lang === 'vi-VN' ||
            v.lang === 'vi_VN' ||
            String(v.lang || '').toLowerCase().startsWith('vi')
        );
        this.preferredVoice = this.availableViVoices[0] || null;
      } catch {
        this.preferredVoice = null;
      }
    };

    findVoice();
    if (typeof window !== 'undefined' && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  setVoiceProfile(profileId) {
    const found = VOICE_PROFILES.find((p) => p.id === profileId);
    if (found) {
      this.currentProfileId = found.id;
    }
    return this.getCurrentProfile();
  }

  getCurrentProfile() {
    return VOICE_PROFILES.find((p) => p.id === this.currentProfileId) || VOICE_PROFILES[0];
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stop();
    }
  }

  /**
   * Strip parenthetical repetition instructions like "(3 lần)" so TTS never reads "ba lần" literally
   */
  static stripRepeatInstruction(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\(\s*\d+\s*lần\s*\)/gi, '').trim();
  }

  /**
   * Parse how many times a verse should be chanted based on "(N lần)" suffix
   */
  static parseRepeatCount(text) {
    if (!text || typeof text !== 'string') return 1;
    const match = text.match(/\(\s*(\d+)\s*lần\s*\)/i);
    if (!match) return 1;
    const count = parseInt(match[1], 10);
    return Number.isFinite(count) && count >= 1 && count <= 10 ? count : 1;
  }

  prefetchVerse(rawText, profileId = this.currentProfileId) {
    if (!this.enabled || !this._canUseNeuralTts()) return;
    const cleanText = DharmaVoice.stripRepeatInstruction(rawText);
    if (!cleanText) return;
    const cacheKey = `${profileId}::${cleanText}`;
    if (this._audioBufferCache.has(cacheKey) || this._inflightPrefetch.has(cacheKey)) return;

    const promise = this._fetchAndDecodeNeuralAudio(cleanText, profileId)
      .catch(() => null)
      .finally(() => {
        this._inflightPrefetch.delete(cacheKey);
      });
    this._inflightPrefetch.set(cacheKey, promise);
  }

  async _fetchAndDecodeNeuralAudio(cleanText, profileId, signal) {
    const cacheKey = `${profileId}::${cleanText}`;
    if (this._audioBufferCache.has(cacheKey)) {
      return this._audioBufferCache.get(cacheKey);
    }

    const ctx = this._ensureAudioContext();
    if (!ctx) throw new Error('AudioContext unavailable');

    const url = `/api/tts?profile=${encodeURIComponent(profileId)}&text=${encodeURIComponent(cleanText)}`;
    const response = await window.fetch(url, {
      method: 'GET',
      headers: { Accept: 'audio/mpeg' },
      signal
    });

    if (!response.ok) {
      throw new Error(`Neural TTS HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength < 256) {
      throw new Error('Empty Neural TTS audio payload');
    }

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    if (this._audioBufferCache.size >= 120) {
      const oldestKey = this._audioBufferCache.keys().next().value;
      if (oldestKey) this._audioBufferCache.delete(oldestKey);
    }
    this._audioBufferCache.set(cacheKey, audioBuffer);
    return audioBuffer;
  }

  _stopNeuralSource() {
    if (this._currentAbortController) {
      try {
        this._currentAbortController.abort();
      } catch {
        // ignore
      }
      this._currentAbortController = null;
    }
    if (this._currentSourceNode) {
      try {
        this._currentSourceNode.onended = null;
        this._currentSourceNode.stop(0);
        this._currentSourceNode.disconnect();
      } catch {
        // ignore
      }
      this._currentSourceNode = null;
    }
  }

  _detachUtteranceAndCancel() {
    this._stopNeuralSource();
    if (this.currentUtterance) {
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
      this.currentUtterance = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
  }

  _startKaraokeTicker(words, durationMs, spokenText, onWordBoundary, sessionId) {
    if (this.karaokeInterval) {
      clearInterval(this.karaokeInterval);
      this.karaokeInterval = null;
    }
    const remainingCount = Math.max(1, words.length - this._currentWordIdx);
    const wordIntervalMs = Math.max(105, Math.floor(durationMs / remainingCount));

    this.karaokeInterval = setInterval(() => {
      if (this.isPaused || !this.isSpeaking || sessionId !== this._speakSessionId) return;
      this._currentWordIdx++;
      if (this._currentWordIdx < words.length) {
        onWordBoundary({
          wordIndex: this._currentWordIdx,
          word: words[this._currentWordIdx],
          charIndex: spokenText.indexOf(words[this._currentWordIdx]),
          totalWords: words.length
        });
      } else if (this.karaokeInterval) {
        clearInterval(this.karaokeInterval);
        this.karaokeInterval = null;
      }
    }, wordIntervalMs);
  }

  /**
   * Speak a verse of Buddhist scripture with karaoke synchronization and fail-safe completion.
   * @param {string} text - Verse scripture text
   * @param {Function} [onEndCallback] - Guaranteed completion callback
   * @param {Function} [onWordBoundary] - Callback for Karaoke ({ wordIndex, word, charIndex, totalWords })
   * @param {number} [startWordIndex=0] - Word index to start from (used when resuming from pause or voice switch)
   */
  speakVerse(text, onEndCallback = () => {}, onWordBoundary = () => {}, startWordIndex = 0) {
    const wasSynthBusy = Boolean(this.synth && (this.synth.speaking || this.synth.pending));
    this._clearAllTimers();
    this._detachUtteranceAndCancel();

    const sessionId = ++this._speakSessionId;

    const spokenText = DharmaVoice.stripRepeatInstruction(text);
    if (!spokenText) {
      this.isSpeaking = false;
      this.isPaused = false;
      onEndCallback();
      return;
    }

    const words = spokenText.split(/\s+/).filter(Boolean);
    const safeStartIdx = Math.max(0, Math.min(startWordIndex, Math.max(0, words.length - 1)));

    this._activeText = spokenText;
    this._activeOnEnd = onEndCallback;
    this._activeOnWord = onWordBoundary;
    this._currentWordIdx = safeStartIdx;
    this.isSpeaking = true;
    this.isPaused = false;

    const profile = this.getCurrentProfile();
    const remainingWords = words.slice(safeStartIdx);
    const remainingText = remainingWords.join(' ');
    const speedFactor = 0.82 / (profile.rate || 0.82);
    const estimatedDurationMs = Math.max(1500, Math.round(remainingText.length * 68 * speedFactor));

    let completed = false;
    const finish = () => {
      if (completed || this.isPaused || !this.isSpeaking || sessionId !== this._speakSessionId) {
        return;
      }
      completed = true;
      this.isSpeaking = false;
      this._clearAllTimers();
      this._stopNeuralSource();
      if (this.currentUtterance) {
        this.currentUtterance.onend = null;
        this.currentUtterance.onerror = null;
        this.currentUtterance = null;
      }
      onEndCallback();
    };

    if (words.length > 0 && safeStartIdx < words.length) {
      onWordBoundary({
        wordIndex: this._currentWordIdx,
        word: words[this._currentWordIdx],
        charIndex: 0,
        totalWords: words.length
      });
    }

    this._startKaraokeTicker(words, estimatedDurationMs, spokenText, onWordBoundary, sessionId);

    if (!this.enabled) {
      this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
      return;
    }

    const startBrowserUtterance = () => {
      if (sessionId !== this._speakSessionId || this.isPaused || !this.isSpeaking) return;
      const hasUtterance = typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window;
      if (!this.synth || !hasUtterance) {
        this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
        return;
      }
      try {
        if (this.availableViVoices.length === 0 && this.synth) {
          this._initVoices();
        }
        const utterance = new window.SpeechSynthesisUtterance(remainingText);
        utterance.lang = 'vi-VN';
        utterance.rate = profile.rate;
        utterance.pitch = profile.pitch;

        if (this.availableViVoices.length > 1) {
          const idx = Math.max(0, VOICE_PROFILES.findIndex((p) => p.id === profile.id));
          utterance.voice =
            this.availableViVoices[idx % this.availableViVoices.length] || this.preferredVoice;
        } else if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
        }

        utterance.onend = () => {
          if (sessionId === this._speakSessionId && !this.isPaused && this.isSpeaking) {
            finish();
          }
        };

        utterance.onerror = (evt) => {
          const errType = String(evt?.error || '').toLowerCase();
          if (errType === 'canceled' || errType === 'interrupted') {
            return;
          }
          if (sessionId === this._speakSessionId && !completed && !this.isPaused && this.isSpeaking) {
            finish();
          }
        };

        this.currentUtterance = utterance;

        const watchdogMs = estimatedDurationMs + 1100;
        if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
        this.watchdogTimer = setTimeout(() => {
          finish();
        }, watchdogMs);

        if (this.synth.paused) {
          this.synth.resume();
        }
        this.synth.speak(utterance);
      } catch (err) {
        console.warn('DharmaVoice speak failed, using fallback timer:', err);
        this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
      }
    };

    if (this._canUseNeuralTts()) {
      this._speakWithNeuralTts(
        remainingText,
        profile,
        words,
        spokenText,
        onWordBoundary,
        finish,
        startBrowserUtterance,
        sessionId
      );
      return;
    }

    // If synth was busy right before cancel(), wait 35ms so Chrome/Safari doesn't drop the new utterance
    if (wasSynthBusy) {
      this.speakDelayTimer = setTimeout(startBrowserUtterance, 35);
    } else {
      startBrowserUtterance();
    }
  }

  async _speakWithNeuralTts(
    remainingText,
    profile,
    words,
    spokenText,
    onWordBoundary,
    finish,
    fallbackFn,
    sessionId
  ) {
    try {
      const abortController =
        typeof AbortController !== 'undefined' ? new AbortController() : null;
      this._currentAbortController = abortController;

      const audioBuffer = await this._fetchAndDecodeNeuralAudio(
        remainingText,
        profile.id,
        abortController?.signal
      );

      if (sessionId !== this._speakSessionId || this.isPaused || !this.isSpeaking) {
        return;
      }

      const ctx = this._ensureAudioContext();
      if (!ctx || !audioBuffer) {
        throw new Error('AudioContext or AudioBuffer unavailable');
      }

      const actualDurationMs = Math.max(900, Math.round(audioBuffer.duration * 1000));
      this._startKaraokeTicker(words, actualDurationMs, spokenText, onWordBoundary, sessionId);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const warmthEq = ctx.createBiquadFilter();
      warmthEq.type = 'lowshelf';
      warmthEq.frequency.value = 185;
      warmthEq.gain.value = profile.warmthDb ?? 3.5;

      const silkHighEq = ctx.createBiquadFilter();
      silkHighEq.type = 'highshelf';
      silkHighEq.frequency.value = 5800;
      silkHighEq.gain.value = -2.4;

      const dryGain = ctx.createGain();
      dryGain.gain.value = 0.92;

      source.connect(warmthEq);
      warmthEq.connect(silkHighEq);
      silkHighEq.connect(dryGain);
      dryGain.connect(ctx.destination);

      if (this._reverbImpulse) {
        const convolver = ctx.createConvolver();
        convolver.buffer = this._reverbImpulse;
        const wetGain = ctx.createGain();
        wetGain.gain.value = profile.reverbWet ?? 0.16;
        silkHighEq.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(ctx.destination);
      }

      this._currentSourceNode = source;
      source.onended = () => {
        if (sessionId === this._speakSessionId && !this.isPaused && this.isSpeaking) {
          finish();
        }
      };

      if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
      this.watchdogTimer = setTimeout(() => {
        finish();
      }, actualDurationMs + 1200);

      source.start(0);
    } catch {
      if (sessionId !== this._speakSessionId || this.isPaused || !this.isSpeaking) {
        return;
      }
      fallbackFn();
    }
  }

  pause() {
    if (!this.isSpeaking || this.isPaused) return;
    this.isPaused = true;
    this._speakSessionId++;
    this._clearAllTimers();
    this._detachUtteranceAndCancel();
  }

  resume() {
    if (!this.isPaused || !this._activeText) return;
    this.isPaused = false;
    this.speakVerse(
      this._activeText,
      this._activeOnEnd || (() => {}),
      this._activeOnWord || (() => {}),
      this._currentWordIdx
    );
  }

  stop() {
    this._speakSessionId++;
    this.isSpeaking = false;
    this.isPaused = false;
    this._activeText = '';
    this._activeOnEnd = null;
    this._activeOnWord = null;
    this._currentWordIdx = 0;
    this._clearAllTimers();
    this._detachUtteranceAndCancel();
  }

  _clearAllTimers() {
    if (this.speakDelayTimer) {
      clearTimeout(this.speakDelayTimer);
      this.speakDelayTimer = null;
    }
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.karaokeInterval) {
      clearInterval(this.karaokeInterval);
      this.karaokeInterval = null;
    }
  }
}
