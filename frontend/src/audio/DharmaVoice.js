/**
 * CHÙA ONLINE 3D - Dharma Voice AI (Web Speech API + Resilient Karaoke Engine)
 * Features:
 * - Natural Vietnamese chanting voice (lang: 'vi-VN', rate: 0.82, pitch: 0.80)
 * - Automatic fallback timer for unsupported browsers or disabled audio
 * - Anti-hang watchdog timeout guaranteeing callback delivery across all OSes
 * - Synthesized Karaoke word boundary progress for fluid golden text highlighting
 */

export class DharmaVoice {
  constructor() {
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window 
      ? window.speechSynthesis 
      : null;
    this.enabled = true;
    this.isSpeaking = false;
    this.preferredVoice = null;

    this.currentUtterance = null;
    this.watchdogTimer = null;
    this.fallbackTimer = null;
    this.karaokeInterval = null;

    this._initVoices();
  }

  /**
   * Scan and pick best Vietnamese voice available
   * @private
   */
  _initVoices() {
    if (!this.synth) return;

    const findVoice = () => {
      try {
        const voices = this.synth.getVoices();
        this.preferredVoice = voices.find(v => v.lang === 'vi-VN' || v.lang === 'vi_VN' || v.lang.startsWith('vi')) || null;
      } catch {
        this.preferredVoice = null;
      }
    };

    findVoice();
    if (typeof window !== 'undefined' && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  /**
   * Enable or disable voice chanting
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stop();
    }
  }

  /**
   * Speak a verse of Buddhist scripture with karaoke synchronization and fail-safe completion.
   * @param {string} text - Verse scripture text
   * @param {Function} [onEndCallback] - Guaranteed completion callback
   * @param {Function} [onWordBoundary] - Callback for Karaoke ({ wordIndex, word, charIndex, totalWords })
   */
  speakVerse(text, onEndCallback = () => {}, onWordBoundary = () => {}) {
    this.stop();

    if (!text || typeof text !== 'string') {
      onEndCallback();
      return;
    }

    this.isSpeaking = true;
    const cleanText = text.trim();
    const words = cleanText.split(/\s+/).filter(Boolean);
    const estimatedDurationMs = Math.max(2500, cleanText.length * 75);

    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      this.isSpeaking = false;
      this._clearAllTimers();
      onEndCallback();
    };

    // Setup Karaoke Word Boundary Ticker (Synthesized to ensure 100% reliable highlighting across browsers)
    const wordIntervalMs = Math.max(120, Math.floor(estimatedDurationMs / Math.max(1, words.length)));
    let currentWordIdx = 0;

    // Immediately highlight the first word
    if (words.length > 0) {
      onWordBoundary({
        wordIndex: 0,
        word: words[0],
        charIndex: 0,
        totalWords: words.length
      });
    }

    this.karaokeInterval = setInterval(() => {
      currentWordIdx++;
      if (currentWordIdx < words.length) {
        onWordBoundary({
          wordIndex: currentWordIdx,
          word: words[currentWordIdx],
          charIndex: cleanText.indexOf(words[currentWordIdx]),
          totalWords: words.length
        });
      } else {
        if (this.karaokeInterval) {
          clearInterval(this.karaokeInterval);
          this.karaokeInterval = null;
        }
      }
    }, wordIntervalMs);

    // Fallback mode if speech synthesis is disabled or unsupported
    const hasUtterance = typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window;
    if (!this.enabled || !this.synth || !hasUtterance) {
      this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
      return;
    }

    try {
      const utterance = new window.SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.82; // Solemn, steady chanting tempo
      utterance.pitch = 0.80; // Grounded, warm tone

      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      utterance.onend = () => {
        finish();
      };

      utterance.onerror = (err) => {
        // Fallback to time-based finish on speech error
        if (!completed) {
          finish();
        }
      };

      this.currentUtterance = utterance;

      // Watchdog timeout to guarantee completion even if browser synthesis stalls
      const watchdogMs = estimatedDurationMs + 1000;
      this.watchdogTimer = setTimeout(() => {
        finish();
      }, watchdogMs);

      // Trigger speech
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('DharmaVoice speak failed, using fallback timer:', err);
      this.fallbackTimer = setTimeout(finish, estimatedDurationMs);
    }
  }

  /**
   * Stop current speech and cancel all active timers
   */
  stop() {
    this.isSpeaking = false;
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

  /**
   * Clear all pending timeouts and intervals
   * @private
   */
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
