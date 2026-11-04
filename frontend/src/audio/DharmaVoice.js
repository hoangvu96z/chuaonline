/**
 * CHÙA ONLINE 3D - Dharma Voice AI (Web Speech API + Multi-Voice Profiles + Resilient Karaoke Engine)
 * Features:
 * - 4 selectable Voice Profiles (Thầy Trụ Trì Trầm Ấm, Sư Cô Thanh Nhã, Chú Tiểu Trong Trẻo, Đại Chúng Trang Nghiêm)
 * - Automatic strip of "(3 lần)" instruction text so TTS never reads the literal words "ba lần"
 * - Session-token guarded speech lifecycle so changing voice profiles, pausing, or stopping never triggers stale callbacks
 * - Pause & Resume support (`pause()`, `resume()`) from exact word boundary
 * - Automatic fallback timer for unsupported browsers or disabled audio
 * - Anti-hang watchdog timeout guaranteeing callback delivery across all OSes
 * - Synthesized Karaoke word boundary progress for fluid golden text highlighting
 */

export const VOICE_PROFILES = [
  {
    id: 'SU_ONG_TRAM_AM',
    name: '🧔‍♂️ Thầy Trụ Trì (Trầm Ấm)',
    rate: 0.78,
    pitch: 0.62,
    preferGender: 'male'
  },
  {
    id: 'SU_CO_THANH_NHA',
    name: '👩‍🦰 Sư Cô (Thanh Nhã)',
    rate: 0.86,
    pitch: 1.22,
    preferGender: 'female'
  },
  {
    id: 'CHU_TIEU_TRONG_TREO',
    name: '👶 Chú Tiểu (Trong Trẻo)',
    rate: 0.95,
    pitch: 1.45,
    preferGender: 'female'
  },
  {
    id: 'DAI_CHUNG_TRANG_NGHIEM',
    name: '☸️ Pháp Hội (Trang Nghiêm)',
    rate: 0.82,
    pitch: 0.88,
    preferGender: 'any'
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

    // State for resuming after pause or mid-verse voice change
    this._activeText = '';
    this._activeOnEnd = null;
    this._activeOnWord = null;
    this._currentWordIdx = 0;

    this._initVoices();
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

  _detachUtteranceAndCancel() {
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
      if (this.currentUtterance) {
        this.currentUtterance.onend = null;
        this.currentUtterance.onerror = null;
        this.currentUtterance = null;
      }
      onEndCallback();
    };

    // Setup Karaoke Word Boundary Ticker
    const wordIntervalMs = Math.max(
      105,
      Math.floor(estimatedDurationMs / Math.max(1, remainingWords.length))
    );

    if (words.length > 0 && safeStartIdx < words.length) {
      onWordBoundary({
        wordIndex: this._currentWordIdx,
        word: words[this._currentWordIdx],
        charIndex: 0,
        totalWords: words.length
      });
    }

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

    const hasUtterance = typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window;
    if (!this.enabled || !this.synth || !hasUtterance) {
      this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
      return;
    }

    const startBrowserUtterance = () => {
      if (sessionId !== this._speakSessionId || this.isPaused || !this.isSpeaking) return;
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

    // If synth was busy right before cancel(), wait 35ms so Chrome/Safari doesn't drop the new utterance
    if (wasSynthBusy) {
      this.speakDelayTimer = setTimeout(startBrowserUtterance, 35);
    } else {
      startBrowserUtterance();
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
