/**
 * NHÀ THỜ CÔNG GIÁO ONLINE 3D - Lector Voice AI (Web Speech API + 4 Giọng Đọc Phụng Vụ + Karaoke Engine)
 * Tính năng:
 * - 4 Giọng đọc phụng vụ: Cha Chủ Tế Trầm Ấm, Soeur Ca Trưởng Thanh Nhã, Thiếu Nhi Thánh Thể, Cộng Đoàn Trang Nghiêm
 * - Tự động lọc bỏ chữ "(3 lần)" khỏi văn bản đọc để TTS không bao giờ đọc nguyên văn chữ "ba lần"
 * - Hỗ trợ Tạm dừng / Tiếp tục (`pause()`, `resume()`)
 * - Bộ đếm thời gian dự phòng (fallback timer) và chống treo (watchdog timer) đảm bảo hoạt động trên mọi trình duyệt
 * - Đồng bộ chữ Karaoke vàng rực theo từng nhịp lời kinh
 */

export const LECTOR_VOICE_PROFILES = [
  {
    id: 'CHA_CHU_TE_TRAM_AM',
    name: '✝️ Cha Chủ Tế (Trầm Ấm)',
    rate: 0.78,
    pitch: 0.68,
    preferGender: 'male'
  },
  {
    id: 'SOEUR_CA_TRUONG_THANH_NHA',
    name: '🙏 Soeur Ca Trưởng (Thanh Nhã)',
    rate: 0.85,
    pitch: 1.16,
    preferGender: 'female'
  },
  {
    id: 'THIEU_NHI_THANH_THE',
    name: '⚜️ Thiếu Nhi Thánh Thể (Trong Trẻo)',
    rate: 0.94,
    pitch: 1.35,
    preferGender: 'female'
  },
  {
    id: 'CONG_DOAN_TRANG_NGHIEM',
    name: '🕯️ Cộng Đoàn (Trang Nghiêm)',
    rate: 0.82,
    pitch: 0.86,
    preferGender: 'any'
  }
];

export class LectorVoice {
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
    this.currentProfileId = 'CHA_CHU_TE_TRAM_AM';

    this.currentUtterance = null;
    this.watchdogTimer = null;
    this.fallbackTimer = null;
    this.karaokeInterval = null;

    // Trạng thái phục vụ Tạm dừng & Tiếp tục
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
    const found = LECTOR_VOICE_PROFILES.find((p) => p.id === profileId);
    if (found) {
      this.currentProfileId = found.id;
    }
    return this.getCurrentProfile();
  }

  getCurrentProfile() {
    return LECTOR_VOICE_PROFILES.find((p) => p.id === this.currentProfileId) || LECTOR_VOICE_PROFILES[0];
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stop();
    }
  }

  /**
   * Lọc bỏ chỉ dẫn lặp lại trong ngoặc như "(3 lần)" để giọng đọc AI không đọc chữ "ba lần"
   */
  static stripRepeatInstruction(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\(\s*\d+\s*lần\s*\)/gi, '').trim();
  }

  /**
   * Trích xuất số lần cần lặp lại câu kinh dựa trên hậu tố "(N lần)"
   */
  static parseRepeatCount(text) {
    if (!text || typeof text !== 'string') return 1;
    const match = text.match(/\(\s*(\d+)\s*lần\s*\)/i);
    if (!match) return 1;
    const count = parseInt(match[1], 10);
    return Number.isFinite(count) && count >= 1 && count <= 10 ? count : 1;
  }

  /**
   * Đọc một câu kinh phụng vụ kèm đồng bộ chữ Karaoke và cơ chế hoàn tất an toàn.
   * @param {string} text - Nội dung câu kinh
   * @param {Function} [onEndCallback] - Callback gọi khi đọc xong câu kinh
   * @param {Function} [onWordBoundary] - Callback cập nhật chữ Karaoke ({ wordIndex, word, charIndex, totalWords })
   * @param {number} [startWordIndex=0] - Vị trí chữ bắt đầu (dùng khi tiếp tục sau tạm dừng)
   */
  speakVerse(text, onEndCallback = () => {}, onWordBoundary = () => {}, startWordIndex = 0) {
    this.stop();

    const spokenText = LectorVoice.stripRepeatInstruction(text);
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

    // Thiết lập bộ đếm nhịp chữ Karaoke
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
        const idx = LECTOR_VOICE_PROFILES.findIndex((p) => p.id === profile.id);
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
      console.warn('LectorVoice speak failed, using fallback timer:', err);
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
