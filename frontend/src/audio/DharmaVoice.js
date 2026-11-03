/**
 * CHÙA ONLINE 3D - Dharma Voice AI (Web Speech API + Multi-Voice Profiles + Resilient Karaoke Engine)
 * Features:
 * - 4 selectable Voice Profiles (Thầy Trụ Trì Trầm Ấm, Sư Cô Thanh Nhã, Chú Tiểu Minh Tâm, Đại Chúng Tịnh Độ)
 * - Automatic strip of "(3 lần)" instruction text so TTS never reads the literal words "ba lần"
 * - Pause & Resume support (`pause()`, `resume()`)
 * - Automatic fallback timer for unsupported browsers or disabled audio
 * - Anti-hang watchdog timeout guaranteeing callback delivery across all OSes
 * - Synthesized Karaoke word boundary progress for fluid golden text highlighting
 */

export const VOICE_PROFILES = [
  {
    id: 'SU_ONG_TRAM_AM',
    name: '🧔‍♂️ Thầy Trụ Trì (Trầm Ấm)',
    rate: 0.78,
    pitch: 0.65,
    preferGender: 'male'
  },
  {
    id: 'SU_CO_THANH_NHA',
    name: '👩‍🦰 Sư Cô (Thanh Nhã)',
    rate: 0.85,
    pitch: 1.18,
    preferGender: 'female'
  },
  {
    id: 'CHU_TIEU_TRONG_TREO',
    name: '👶 Chú Tiểu (Trong Trẻo)',
    rate: 0.94,
    pitch: 1.38,
    preferGender: 'female'
  },
  {
    id: 'DAI_CHUNG_TRANG_NGHIEM',
    name: '☸️ Pháp Hội (Trang Nghiêm)',
    rate: 0.82,
    pitch: 0.85,
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

    // State for resuming after pause
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
        const voices = this.synth.getVoices();
        this.availableViVoices = voices.filter(
          (v) => v.lang === 'vi-VN' || v.lang === 'vi_VN' || v.lang.toLowerCase().startsWith('vi')
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

  /**
   * Speak a verse of Buddhist scripture with karaoke synchronization and fail-safe completion.
   * @param {string} text - Verse scripture text
   * @param {Function} [onEndCallback] - Guaranteed completion callback
   * @param {Function} [onWordBoundary] - Callback for Karaoke ({ wordIndex, word, charIndex, totalWords })
   * @param {number} [startWordIndex=0] - Word index to start from (used when resuming from pause)
   */
  speakVerse(text, onEndCallback = () => {}, onWordBoundary = () => {}, startWordIndex = 0) {
    this.stop();

    const spokenText = DharmaVoice.stripRepeatInstruction(text);
    if (!spokenText) {
      onEndCallback();
      return;
    }

    this._activeText = spokenText;
    this._activeOnEnd = onEndCallback;
    this._activeOnWord = onWordBoundary;
    this.isSpeaking = true;
    this.isPaused = false;

    const profile = this.getCurrentProfile();
    const words = spokenText.split(/\s+/).filter(Boolean);
    const remainingWords = words.slice(startWordIndex);
    const remainingText = remainingWords.join(' ');
    const speedFactor = 0.82 / (profile.rate || 0.82);
    const estimatedDurationMs = Math.max(1800, Math.round(remainingText.length * 72 * speedFactor));

    let completed = false;
    const finish = () => {
      if (completed || this.isPaused) return;
      completed = true;
      this.isSpeaking = false;
      this._clearAllTimers();
      onEndCallback();
    };

    // Setup Karaoke Word Boundary Ticker
    const wordIntervalMs = Math.max(110, Math.floor(estimatedDurationMs / Math.max(1, remainingWords.length)));
    this._currentWordIdx = startWordIndex;

    if (words.length > 0 && startWordIndex < words.length) {
      onWordBoundary({
        wordIndex: this._currentWordIdx,
        word: words[this._currentWordIdx],
        charIndex: 0,
        totalWords: words.length
      });
    }

    this.karaokeInterval = setInterval(() => {
      if (this.isPaused) return;
      this._currentWordIdx++;
      if (this._currentWordIdx < words.length) {
        onWordBoundary({
          wordIndex: this._currentWordIdx,
          word: words[this._currentWordIdx],
          charIndex: spokenText.indexOf(words[this._currentWordIdx]),
          totalWords: words.length
        });
      } else {
        if (this.karaokeInterval) {
          clearInterval(this.karaokeInterval);
          this.karaokeInterval = null;
        }
      }
    }, wordIntervalMs);

    const hasUtterance = typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window;
    if (!this.enabled || !this.synth || !hasUtterance) {
      this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
      return;
    }

    try {
      const utterance = new window.SpeechSynthesisUtterance(remainingText);
      utterance.lang = 'vi-VN';
      utterance.rate = profile.rate;
      utterance.pitch = profile.pitch;

      if (this.availableViVoices.length > 1) {
        const idx = VOICE_PROFILES.findIndex((p) => p.id === profile.id);
        utterance.voice = this.availableViVoices[idx % this.availableViVoices.length] || this.preferredVoice;
      } else if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      utterance.onend = () => {
        if (!this.isPaused) finish();
      };

      utterance.onerror = () => {
        if (!completed && !this.isPaused) {
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
  }

  pause() {
    if (!this.isSpeaking || this.isPaused) return;
    this.isPaused = true;
    this._clearAllTimers();
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
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
    this.isSpeaking = false;
    this.isPaused = false;
    this._clearAllTimers();

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    this.currentUtterance = null;
  }

  _clearAllTimers() {
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
