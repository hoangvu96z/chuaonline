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
    playbackRate: 0.90,
    detuneCents: -220,
    warmthDb: 4.4,
    reverbWet: 0.19
  },
  {
    id: 'SU_CO_THANH_NHA',
    name: '👩‍🦰 Sư Cô (Thanh Nhã Neural)',
    rate: 0.86,
    pitch: 1.22,
    preferGender: 'female',
    playbackRate: 0.95,
    detuneCents: 25,
    warmthDb: 2.0,
    reverbWet: 0.15
  },
  {
    id: 'CHU_TIEU_TRONG_TREO',
    name: '👶 Chú Tiểu (Trong Trẻo)',
    rate: 0.95,
    pitch: 1.45,
    preferGender: 'female',
    playbackRate: 1.03,
    detuneCents: 190,
    warmthDb: 1.2,
    reverbWet: 0.12
  },
  {
    id: 'DAI_CHUNG_TRANG_NGHIEM',
    name: '☸️ Pháp Hội (Trang Nghiêm Neural)',
    rate: 0.82,
    pitch: 0.88,
    preferGender: 'any',
    playbackRate: 0.93,
    detuneCents: -115,
    warmthDb: 3.5,
    reverbWet: 0.23
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
    this.speedMultiplier = 1.0; // Hệ số tinh chỉnh tốc độ chữ & giọng đọc (0.5x -> 1.8x)
    this.voiceVolume = 1.0; // Âm lượng giọng tụng (0.0 -> 1.5, mặc định 1.0 = 100%)

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
    this._masterVoiceGain = null;
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

  /**
   * Tinh chỉnh hệ số tốc độ chữ chạy Karaoke & giọng đọc (0.5x -> 1.8x)
   * Cập nhật trực tiếp playbackRate của Web Audio Neural TTS đang phát mà không làm ngắt tiếng!
   */
  setSpeedMultiplier(multiplier) {
    const parsed = Number(multiplier);
    if (Number.isFinite(parsed)) {
      this.speedMultiplier = Math.max(0.5, Math.min(1.8, Number(parsed.toFixed(2))));
      if (this._currentSourceNode && this._currentSourceNode.playbackRate) {
        const profile = this.getCurrentProfile();
        const basePbRate = profile.playbackRate || 0.90;
        this._currentSourceNode.playbackRate.value = Math.max(
          0.45,
          Math.min(1.85, basePbRate * this.speedMultiplier)
        );
      }
    }
    return this.speedMultiplier;
  }

  getSpeedMultiplier() {
    return this.speedMultiplier;
  }

  /**
   * Điều chỉnh âm lượng giọng tụng kinh (0.0 -> 1.5) theo thời gian thực
   */
  setVolume(vol) {
    const parsed = Number(vol);
    if (Number.isFinite(parsed)) {
      this.voiceVolume = Math.max(0, Math.min(1.5, Number(parsed.toFixed(2))));
      if (this._masterVoiceGain && this._audioCtx) {
        this._masterVoiceGain.gain.setValueAtTime(this.voiceVolume, this._audioCtx.currentTime);
      }
      if (this.currentUtterance) {
        this.currentUtterance.volume = Math.max(0, Math.min(1, this.voiceVolume));
      }
    }
    return this.voiceVolume;
  }

  getVolume() {
    return this.voiceVolume;
  }

  /**
   * Tính thời lượng hiển thị tự nhiên của từng chữ (ms) theo tốc độ giọng đọc & dấu câu
   * để chữ chạy khớp với nhịp ngắt nghỉ của giọng đọc tiếng Việt.
   */
  _computeWordDurationMs(word, effectiveRate) {
    const clean = String(word || '').trim();
    const rateScale = 0.82 / Math.max(0.4, effectiveRate || 0.82);
    let baseMs = 240 + Math.max(0, clean.length - 3) * 16;

    // Ngắt nhịp tự nhiên khi gặp dấu phẩy, chấm phẩy, hai chấm, gạch ngang
    if (/[,;:—–-]$/.test(clean)) {
      baseMs += 195;
    } else if (/[.!?…]$/.test(clean)) {
      baseMs += 290;
    }

    return Math.max(75, Math.round(baseMs * rateScale));
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
    return text
      .replace(/^\(\s*(?:Câu|Đệ)\s+[^)]+\)\s*/i, '')
      .replace(/\(\s*\d+\s*lần\s*\)/gi, '')
      .trim();
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

    const baseUrl =
      typeof window !== 'undefined' &&
      (window.location.port === '5173' || window.location.port === '4173')
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : '';
    const url = `${baseUrl}/api/tts?profile=${encodeURIComponent(profileId)}&text=${encodeURIComponent(cleanText)}`;
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
      this.currentUtterance.onboundary = null;
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

  _startKaraokeTicker(words, targetTotalDurationMs, spokenText, onWordBoundary, sessionId) {
    if (this.karaokeInterval) {
      clearTimeout(this.karaokeInterval);
      clearInterval(this.karaokeInterval);
      this.karaokeInterval = null;
    }

    const startIdx = this._currentWordIdx;
    const remainingSlice = words.slice(startIdx);
    const rawWeights = remainingSlice.map((w) => this._computeWordDurationMs(w, 0.82));
    const totalRawWeight = Math.max(1, rawWeights.reduce((acc, v) => acc + v, 0));
    const baseSpeedAtStart = this.speedMultiplier || 1.0;

    const scheduleNextWordStep = () => {
      if (this.karaokeInterval) {
        clearTimeout(this.karaokeInterval);
        this.karaokeInterval = null;
      }
      if (this.isPaused || !this.isSpeaking || sessionId !== this._speakSessionId) return;
      if (this._currentWordIdx >= words.length - 1) return;

      const relIdx = Math.max(0, this._currentWordIdx - startIdx);
      const wordWeight = rawWeights[relIdx] || 240;
      const liveSpeedRatio = baseSpeedAtStart / Math.max(0.5, this.speedMultiplier || 1.0);
      const stepDelayMs = Math.max(
        65,
        Math.round((wordWeight / totalRawWeight) * targetTotalDurationMs * liveSpeedRatio)
      );

      this.karaokeInterval = setTimeout(() => {
        if (this.isPaused || !this.isSpeaking || sessionId !== this._speakSessionId) return;
        if (this._currentWordIdx + 1 < words.length) {
          this._currentWordIdx++;
          onWordBoundary({
            wordIndex: this._currentWordIdx,
            word: words[this._currentWordIdx],
            charIndex: spokenText.indexOf(words[this._currentWordIdx]),
            totalWords: words.length
          });
          scheduleNextWordStep();
        }
      }, stepDelayMs);
    };

    scheduleNextWordStep();
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
    const effectiveRate = Math.max(
      0.45,
      Math.min(1.85, Number(((profile.rate || 0.82) * this.speedMultiplier).toFixed(2)))
    );
    const remainingWords = words.slice(safeStartIdx);
    const remainingText = remainingWords.join(' ');

    // Build character offset lookup table in remainingText for native SpeechSynthesis onboundary mapping
    const remainingWordOffsets = [];
    let cursor = 0;
    for (let i = 0; i < remainingWords.length; i++) {
      const w = remainingWords[i];
      const startChar = cursor;
      const endChar = startChar + w.length;
      remainingWordOffsets.push({
        globalWordIdx: safeStartIdx + i,
        word: w,
        startChar,
        endChar
      });
      cursor = endChar + 1; // +1 for space
    }

    const totalWeightedMs = remainingWords.reduce(
      (sum, w) => sum + this._computeWordDurationMs(w, effectiveRate),
      0
    );
    const estimatedDurationMs = Math.max(1200, totalWeightedMs + 280);

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
        this.currentUtterance.onboundary = null;
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

    if (!this.enabled) {
      this._startKaraokeTicker(words, estimatedDurationMs, spokenText, onWordBoundary, sessionId);
      this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
      return;
    }

    const startBrowserUtterance = () => {
      if (sessionId !== this._speakSessionId || this.isPaused || !this.isSpeaking) return;
      this._startKaraokeTicker(words, estimatedDurationMs, spokenText, onWordBoundary, sessionId);
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
        utterance.rate = effectiveRate;
        utterance.pitch = profile.pitch;
        utterance.volume = Math.max(0, Math.min(1, this.voiceVolume));

        if (this.availableViVoices.length > 1) {
          const idx = Math.max(0, VOICE_PROFILES.findIndex((p) => p.id === profile.id));
          utterance.voice =
            this.availableViVoices[idx % this.availableViVoices.length] || this.preferredVoice;
        } else if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
        }

        // Synchronize Karaoke word position with native TTS boundary events when supported by OS voice
        utterance.onboundary = (evt) => {
          if (sessionId !== this._speakSessionId || this.isPaused || !this.isSpeaking) return;
          if (typeof evt?.charIndex !== 'number') return;
          const cIdx = evt.charIndex;
          const matched = remainingWordOffsets.find(
            (item) => cIdx >= item.startChar && cIdx <= item.endChar + 1
          );
          if (matched && matched.globalWordIdx !== this._currentWordIdx) {
            this._currentWordIdx = matched.globalWordIdx;
            onWordBoundary({
              wordIndex: this._currentWordIdx,
              word: words[this._currentWordIdx],
              charIndex: cIdx,
              totalWords: words.length
            });
          }
        };

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

        const watchdogMs = estimatedDurationMs + 1400;
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

      const pbRate = Math.max(
        0.45,
        Math.min(1.85, (profile.playbackRate || 0.90) * (this.speedMultiplier || 1.0))
      );
      const detune = profile.detuneCents || 0;
      const effectiveRate = pbRate * Math.pow(2, detune / 1200);
      // Subtract ~180ms of trailing silence in MP3 so karaoke finishes last word right as voice finishes
      const spokenAudioSec = Math.max(0.6, audioBuffer.duration - 0.18);
      const actualDurationMs = Math.max(
        700,
        Math.round((spokenAudioSec / Math.max(0.45, effectiveRate)) * 1000)
      );
      this._startKaraokeTicker(words, actualDurationMs, spokenText, onWordBoundary, sessionId);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      if (source.playbackRate) source.playbackRate.value = pbRate;
      if (source.detune) source.detune.value = detune;

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

      if (!this._masterVoiceGain) {
        this._masterVoiceGain = ctx.createGain();
        this._masterVoiceGain.connect(ctx.destination);
      }
      this._masterVoiceGain.gain.setValueAtTime(this.voiceVolume, ctx.currentTime);

      source.connect(warmthEq);
      warmthEq.connect(silkHighEq);
      silkHighEq.connect(dryGain);
      dryGain.connect(this._masterVoiceGain);

      if (this._reverbImpulse) {
        const convolver = ctx.createConvolver();
        convolver.buffer = this._reverbImpulse;
        const wetGain = ctx.createGain();
        wetGain.gain.value = profile.reverbWet ?? 0.16;
        silkHighEq.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(this._masterVoiceGain);
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
      clearTimeout(this.karaokeInterval);
      clearInterval(this.karaokeInterval);
      this.karaokeInterval = null;
    }
  }
}
