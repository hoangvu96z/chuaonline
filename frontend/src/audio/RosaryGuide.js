/**
 * NHÀ THỜ CÔNG GIÁO ONLINE 3D - Rosary & Liturgical Prayer Synchronizer (`RosaryGuide`)
 * Đồng bộ hóa:
 * - Nhịp lần hạt Mân Côi (`playRosaryBeadClick`)
 * - Tiếng Chuông Cung Thánh (`playSanctuaryChime`) & Chuông Tháp Giáo Đường (`playChurchTowerBell`)
 * - Đàn Đại Quản Cầm nền (`startOrganPad` / `stopOrganPad`)
 * - Giọng đọc Phụng vụ AI (`LectorVoice`) + Chữ Karaoke vàng + Tự động lặp câu "(3 lần)"
 * - Chế độ Tự động đọc (Auto) & Tự tay lần hạt theo chữ (Manual Bead Click)
 */

import { LectorVoice } from './LectorVoice.js';

export class RosaryGuide {
  constructor(sacredAudio, lectorVoice, onVerseChange, onComplete) {
    this.audio = sacredAudio;
    this.voice = lectorVoice;
    this.onVerseChange = onVerseChange; // Callback cập nhật UI Sách Kinh Karaoke & cộng Ân Sủng
    this.onComplete = onComplete;       // Callback hoàn thành bài kinh (+Thưởng Hoa Thiêng)
    this.isPraying = false;
    this.isPaused = false;
    this.isAuto = true;
    this.currentPrayer = null;
    this.verseIndex = 0;
    this.repeatRound = 0; // Đếm số lần lặp lại câu kinh có ghi "(3 lần)" (0..repeatTotal-1)
    this.beadTimer = null;
    this.nextVerseTimer = null;
    this.manualWordIndex = 0;
    this.currentVerseWords = [];
  }

  startPrayer(prayer, startIndex = 0) {
    this.stop();
    if (!prayer || !Array.isArray(prayer.verses) || prayer.verses.length === 0) return;

    this.isPraying = true;
    this.isPaused = false;
    this.currentPrayer = prayer;
    this.verseIndex = Math.max(0, Math.min(startIndex, prayer.verses.length - 1));
    this.repeatRound = 0;

    // Ngân Chuông Cung Thánh mở đầu giờ kinh & bật nền Đàn Đại Quản Cầm (Pipe Organ)
    if (this.audio) {
      this.audio.playSanctuaryChime();
      this.audio.startOrganPad(prayer.organChordHz || [261.63, 329.63, 392.00]);
    }

    if (this.isAuto) {
      this._startAutoBeadTimer(prayer.beadTempoMs || 900);
      this._readNextVerse();
    } else {
      this._prepareManualVerse();
    }
  }

  _startAutoBeadTimer(tempoMs) {
    if (this.beadTimer) clearInterval(this.beadTimer);
    this.beadTimer = setInterval(() => {
      if (this.isPraying && !this.isPaused && this.isAuto && this.audio) {
        this.audio.playRosaryBeadClick(0.32); // Tiếng lần hạt Mân Côi dịu nhẹ làm nền
      }
    }, tempoMs);
  }

  togglePause() {
    if (!this.isPraying) return false;
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
    return this.isPaused;
  }

  pause() {
    if (!this.isPraying || this.isPaused) return;
    this.isPaused = true;
    if (this.nextVerseTimer) {
      clearTimeout(this.nextVerseTimer);
      this.nextVerseTimer = null;
    }
    if (this.voice && typeof this.voice.pause === 'function') {
      this.voice.pause();
    }
    if (this.audio && typeof this.audio.stopOrganPad === 'function') {
      this.audio.stopOrganPad();
    }
  }

  resume() {
    if (!this.isPraying || !this.isPaused) return;
    this.isPaused = false;
    if (this.audio && this.currentPrayer && typeof this.audio.startOrganPad === 'function') {
      this.audio.startOrganPad(this.currentPrayer.organChordHz || [261.63, 329.63, 392.00]);
    }
    if (this.isAuto) {
      if (this.voice && this.voice.isPaused && typeof this.voice.resume === 'function') {
        this.voice.resume();
      } else {
        this._readNextVerse();
      }
    }
  }

  setAutoMode(isAuto) {
    const nextAuto = Boolean(isAuto);
    if (this.isAuto === nextAuto) return;
    this.isAuto = nextAuto;

    if (!this.isPraying || !this.currentPrayer) return;

    if (this.isAuto) {
      this._startAutoBeadTimer(this.currentPrayer.beadTempoMs || 900);
      if (!this.isPaused) {
        this._readNextVerse();
      }
    } else {
      if (this.beadTimer) {
        clearInterval(this.beadTimer);
        this.beadTimer = null;
      }
      if (this.nextVerseTimer) {
        clearTimeout(this.nextVerseTimer);
        this.nextVerseTimer = null;
      }
      if (this.voice) this.voice.stop();
      this._prepareManualVerse();
    }
  }

  /**
   * Chuẩn hóa câu kinh:
   * - Nếu trong câu có "(3 lần)" -> cleanText bỏ chữ "(3 lần)", repeatTotal = 3 để đọc lại câu đó đủ 3 lần!
   */
  _getVerseObject(index) {
    const raw = this.currentPrayer.verses[index];
    const rawText = typeof raw === 'string' ? raw : raw?.text || '';
    const repeatTotal = LectorVoice.parseRepeatCount(rawText);
    const cleanText = LectorVoice.stripRepeatInstruction(rawText);
    const chime =
      typeof raw === 'string'
        ? index === 0 || index === this.currentPrayer.verses.length - 1
        : Boolean(raw?.chime ?? raw?.bell);

    return {
      rawText,
      text: cleanText,
      chime,
      repeatTotal
    };
  }

  _buildVerseEventPayload(verse, wordIndex, isVerseDone) {
    const totalVerses = this.currentPrayer.verses.length;
    const displaySuffix =
      verse.repeatTotal > 1 ? ` (Lần ${this.repeatRound + 1}/${verse.repeatTotal})` : '';
    const graceEarned = this.currentPrayer.gracePerVerse || 3;

    return {
      prayerId: this.currentPrayer.id,
      prayerTitle: this.currentPrayer.title,
      verseIndex: this.verseIndex,
      totalVerses,
      text: verse.text,
      repeatRound: this.repeatRound + 1,
      repeatTotal: verse.repeatTotal,
      displaySuffix,
      wordIndex,
      isVerseDone,
      graceEarned
    };
  }

  _readNextVerse() {
    if (!this.isPraying || this.isPaused || !this.currentPrayer) return;

    if (this.verseIndex >= this.currentPrayer.verses.length) {
      // Kết thúc bài kinh: Ngân Chuông Tháp Nhà Thờ & Trao Ân Sủng Hoa Thiêng
      if (this.audio) {
        this.audio.stopOrganPad();
        this.audio.playChurchTowerBell();
      }
      const finishedPrayer = this.currentPrayer;
      this.stop();
      if (this.onComplete) this.onComplete(finishedPrayer);
      return;
    }

    const verse = this._getVerseObject(this.verseIndex);

    // Ngân Chuông Cung Thánh ở các câu có đánh dấu chime: true (khi bắt đầu câu)
    if (verse.chime && this.repeatRound === 0 && this.audio) {
      this.audio.playSanctuaryChime();
    }

    // Cập nhật giao diện Sách Kinh Phụng Vụ trên màn hình
    if (this.onVerseChange) {
      this.onVerseChange(this._buildVerseEventPayload(verse, 0, false));
    }

    // Đọc câu kinh đã loại bỏ "(3 lần)" và tự động lặp đủ số lần trước khi sang câu tiếp theo
    this.voice.speakVerse(
      verse.text,
      () => {
        if (!this.isPraying || this.isPaused || !this.isAuto) return;

        // Báo hoàn thành 1 lượt đọc câu kinh để cộng Ân Sủng & nhân vật cúi đầu cung kính
        if (this.onVerseChange) {
          this.onVerseChange(this._buildVerseEventPayload(verse, -1, true));
        }

        if (this.repeatRound + 1 < verse.repeatTotal) {
          // Đọc tiếp lần 2, lần 3 của câu kinh có ghi "(3 lần)"
          this.repeatRound++;
          if (this.audio) this.audio.playSanctuaryChime(0.45);
          this.nextVerseTimer = setTimeout(() => this._readNextVerse(), 450);
        } else {
          // Đã đọc đủ số lần -> sang câu kinh tiếp theo
          this.repeatRound = 0;
          this.verseIndex++;
          this.nextVerseTimer = setTimeout(() => this._readNextVerse(), 520);
        }
      },
      ({ wordIndex }) => {
        if (!this.isPraying || this.isPaused || !this.isAuto) return;
        if (this.onVerseChange) {
          this.onVerseChange(this._buildVerseEventPayload(verse, wordIndex, false));
        }
      }
    );
  }

  _prepareManualVerse() {
    if (!this.currentPrayer || this.verseIndex >= this.currentPrayer.verses.length) return;
    const verse = this._getVerseObject(this.verseIndex);
    this.currentVerseWords = verse.text.trim().split(/\s+/).filter(Boolean);
    this.manualWordIndex = 0;

    if (verse.chime && this.repeatRound === 0 && this.audio) {
      this.audio.playSanctuaryChime();
    }

    if (this.onVerseChange) {
      this.onVerseChange(this._buildVerseEventPayload(verse, 0, false));
    }
  }

  /**
   * Chế độ Tự tay lần hạt Mân Côi theo chữ (Manual Rosary Bead Click):
   * Mỗi lần bấm hạt Mân Côi chuyển sang chữ tiếp theo; nếu câu có "(3 lần)" thì lặp đủ 3 lần trước khi sang câu mới.
   */
  manualClickBead() {
    if (!this.isPraying || !this.currentPrayer) return;
    if (this.audio) {
      this.audio.playRosaryBeadClick(0.65);
    }

    const verse = this._getVerseObject(this.verseIndex);
    const totalVerses = this.currentPrayer.verses.length;
    if (this.currentVerseWords.length === 0) {
      this.currentVerseWords = verse.text.trim().split(/\s+/).filter(Boolean);
    }

    this.manualWordIndex += 2; // Mỗi hạt Mân Côi đọc 2 chữ nhịp nhàng

    if (this.manualWordIndex < this.currentVerseWords.length) {
      if (this.onVerseChange) {
        this.onVerseChange(this._buildVerseEventPayload(verse, this.manualWordIndex, false));
      }
    } else {
      // Đã lần hạt xong 1 lượt của câu kinh
      if (this.onVerseChange) {
        this.onVerseChange(
          this._buildVerseEventPayload(verse, this.currentVerseWords.length - 1, true)
        );
      }

      if (this.repeatRound + 1 < verse.repeatTotal) {
        this.repeatRound++;
        this._prepareManualVerse();
      } else {
        this.repeatRound = 0;
        this.verseIndex++;
        if (this.verseIndex >= totalVerses) {
          if (this.audio) {
            this.audio.stopOrganPad();
            this.audio.playChurchTowerBell();
          }
          const finishedPrayer = this.currentPrayer;
          this.stop();
          if (this.onComplete) this.onComplete(finishedPrayer);
        } else {
          this._prepareManualVerse();
        }
      }
    }
  }

  advanceManualBead() {
    this.manualClickBead();
  }

  stop() {
    this.isPraying = false;
    this.isPaused = false;
    this.repeatRound = 0;
    if (this.beadTimer) {
      clearInterval(this.beadTimer);
      this.beadTimer = null;
    }
    if (this.nextVerseTimer) {
      clearTimeout(this.nextVerseTimer);
      this.nextVerseTimer = null;
    }
    if (this.audio) {
      this.audio.stopOrganPad();
    }
    if (this.voice) {
      this.voice.stop();
    }
  }
}
