// frontend/src/audio/SutraChanter.js
import { DharmaVoice } from './DharmaVoice.js';

export class SutraChanter {
  constructor(zenAudio, dharmaVoice, onVerseChange, onComplete) {
    this.audio = zenAudio;
    this.voice = dharmaVoice;
    this.onVerseChange = onVerseChange; // Callback cập nhật UI chữ Karaoke
    this.onComplete = onComplete;       // Callback cộng thưởng Công Đức khi tụng xong bài
    this.isChanting = false;
    this.isPaused = false;
    this.isAuto = true;
    this.autoWoodenFishVolume = 0.45; // Âm lượng gõ mõ tự động (0.0 -> 1.0, mặc định 0.45 = 45%)
    this.currentSutra = null;
    this.verseIndex = 0;
    this.repeatRound = 0; // Đếm số lần lặp lại câu kinh có ghi "(3 lần)" (0..repeatTotal-1)
    this.woodenFishTimer = null;
    this.nextVerseTimer = null;
    this.manualWordIndex = 0;
    this.currentVerseWords = [];
    this._chantSessionId = 0;
  }

  startSutra(sutra, startIndex = 0) {
    this.stop();
    if (!sutra || !Array.isArray(sutra.verses) || sutra.verses.length === 0) return;

    this._chantSessionId++;
    this.isChanting = true;
    this.isPaused = false;
    this.currentSutra = sutra;
    this.verseIndex = Math.max(0, Math.min(startIndex, sutra.verses.length - 1));
    this.repeatRound = 0;

    // Thỉnh 1 tiếng chuông mở đầu bài kinh
    if (this.audio) {
      this.audio.playMeditationBell();
    }

    if (this.isAuto) {
      this._startAutoWoodenFish(sutra.tempoMs || 680);
      this._readNextVerse(0);
    } else {
      this._prepareManualVerse();
    }
  }

  _startAutoWoodenFish(tempoMs) {
    if (this.woodenFishTimer) clearInterval(this.woodenFishTimer);
    const speedMult = this.getReadingSpeed();
    const scaledTempoMs = Math.max(280, Math.round((tempoMs || 680) / speedMult));
    this.woodenFishTimer = setInterval(() => {
      if (this.isChanting && !this.isPaused && this.isAuto && this.audio) {
        if (this.autoWoodenFishVolume > 0.01) {
          this.audio.playWoodenFish(this.autoWoodenFishVolume);
        }
      }
    }, scaledTempoMs);
  }

  /**
   * Tinh chỉnh âm lượng gõ mõ tự động (0.0 -> 1.0)
   */
  setAutoWoodenFishVolume(volume) {
    const parsed = Number(volume);
    if (Number.isFinite(parsed)) {
      this.autoWoodenFishVolume = Math.max(0, Math.min(1, Number(parsed.toFixed(2))));
    }
    return this.autoWoodenFishVolume;
  }

  getAutoWoodenFishVolume() {
    return this.autoWoodenFishVolume;
  }

  /**
   * Tinh chỉnh âm lượng giọng tụng kinh (0.0 -> 1.5)
   */
  setVoiceVolume(volume) {
    if (this.voice && typeof this.voice.setVolume === 'function') {
      return this.voice.setVolume(volume);
    }
    return 1.0;
  }

  getVoiceVolume() {
    return this.voice && typeof this.voice.getVolume === 'function'
      ? this.voice.getVolume()
      : 1.0;
  }

  /**
   * Tinh chỉnh tốc độ chữ chạy Karaoke & nhịp đọc kinh (0.5x -> 1.8x)
   * @param {number} multiplier - Hệ số tốc độ (0.5 .. 1.8)
   * @param {boolean} [restartUtterance=false] - Nếu true, cập nhật ngay giọng đọc TTS từ chữ hiện tại
   */
  setReadingSpeed(multiplier, restartUtterance = false) {
    const applied =
      this.voice && typeof this.voice.setSpeedMultiplier === 'function'
        ? this.voice.setSpeedMultiplier(multiplier)
        : Math.max(0.5, Math.min(1.8, Number(multiplier) || 1.0));

    if (this.isChanting && this.currentSutra && this.isAuto) {
      this._startAutoWoodenFish(this.currentSutra.tempoMs || 680);
      if (restartUtterance && !this.isPaused) {
        if (this.nextVerseTimer) {
          clearTimeout(this.nextVerseTimer);
          this.nextVerseTimer = null;
        }
        this._chantSessionId++;
        const resumeWordIdx = Math.max(0, Number(this.voice?._currentWordIdx || 0));
        this._readNextVerse(resumeWordIdx, true);
      }
    }
    return applied;
  }

  getReadingSpeed() {
    return this.voice && typeof this.voice.getSpeedMultiplier === 'function'
      ? this.voice.getSpeedMultiplier()
      : 1.0;
  }

  /**
   * Đổi giọng đọc ngay khi đang tụng kinh mà không làm lỗi câu hiện tại hoặc nhảy câu
   */
  changeVoiceProfile(profileId) {
    const profile = this.voice?.setVoiceProfile?.(profileId);
    if (!this.isChanting || !this.currentSutra) {
      return profile;
    }

    // Hủy timer chuyển câu cũ (nếu đang trong khoảng nghỉ 450ms giữa 2 câu)
    if (this.nextVerseTimer) {
      clearTimeout(this.nextVerseTimer);
      this.nextVerseTimer = null;
    }

    // Tăng session ID để mọi callback của giọng đọc cũ bị vô hiệu hóa hoàn toàn
    this._chantSessionId++;

    if (!this.isPaused && this.isAuto) {
      const resumeWordIdx = Math.max(0, Number(this.voice?._currentWordIdx || 0));
      this._readNextVerse(resumeWordIdx, true);
    }
    return profile;
  }

  togglePause() {
    if (!this.isChanting) return false;
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
    return this.isPaused;
  }

  pause() {
    if (!this.isChanting || this.isPaused) return;
    this.isPaused = true;
    this._chantSessionId++;
    if (this.nextVerseTimer) {
      clearTimeout(this.nextVerseTimer);
      this.nextVerseTimer = null;
    }
    if (this.voice && typeof this.voice.pause === 'function') {
      this.voice.pause();
    }
  }

  resume() {
    if (!this.isChanting || !this.isPaused) return;
    this.isPaused = false;
    this._chantSessionId++;
    if (this.isAuto) {
      if (
        this.voice &&
        this.voice.isPaused &&
        this.voice._activeText &&
        typeof this.voice.resume === 'function'
      ) {
        const resumeWordIdx = Math.max(0, Number(this.voice._currentWordIdx || 0));
        this._readNextVerse(resumeWordIdx, true);
      } else {
        this._readNextVerse(0);
      }
    }
  }

  setAutoMode(isAuto) {
    const nextAuto = Boolean(isAuto);
    if (this.isAuto === nextAuto) return;
    this.isAuto = nextAuto;
    this._chantSessionId++;

    if (!this.isChanting || !this.currentSutra) return;

    if (this.isAuto) {
      this._startAutoWoodenFish(this.currentSutra.tempoMs || 680);
      if (!this.isPaused) {
        this._readNextVerse(0);
      }
    } else {
      if (this.woodenFishTimer) {
        clearInterval(this.woodenFishTimer);
        this.woodenFishTimer = null;
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
    const raw = this.currentSutra.verses[index];
    const rawText = typeof raw === 'string' ? raw : raw?.text || '';
    const repeatTotal = DharmaVoice.parseRepeatCount(rawText);
    const cleanText = DharmaVoice.stripRepeatInstruction(rawText);
    const bell =
      typeof raw === 'string'
        ? index === 0 || index === this.currentSutra.verses.length - 1
        : Boolean(raw?.bell);

    return {
      rawText,
      text: cleanText,
      bell,
      repeatTotal
    };
  }

  _readNextVerse(startWordIndex = 0, skipBell = false) {
    if (!this.isChanting || this.isPaused || !this.currentSutra) return;

    const activeSessionId = ++this._chantSessionId;
    if (this.nextVerseTimer) {
      clearTimeout(this.nextVerseTimer);
      this.nextVerseTimer = null;
    }

    if (this.verseIndex >= this.currentSutra.verses.length) {
      // Kết thúc bài kinh: Thỉnh Đại Hồng Chung & Hồi hướng
      if (this.audio) this.audio.playGreatBell();
      const finishedSutra = this.currentSutra;
      this.stop();
      if (this.onComplete) this.onComplete(finishedSutra);
      return;
    }

    const verse = this._getVerseObject(this.verseIndex);
    const totalVerses = this.currentSutra.verses.length;

    // Tải trước (prefetch) 2 câu kinh tiếp theo để giọng đọc Neural phát liền mạch không độ trễ
    if (this.voice && typeof this.voice.prefetchVerse === 'function') {
      if (this.verseIndex + 1 < totalVerses) {
        const nextV1 = this._getVerseObject(this.verseIndex + 1);
        this.voice.prefetchVerse(nextV1.text);
      }
      if (this.verseIndex + 2 < totalVerses) {
        const nextV2 = this._getVerseObject(this.verseIndex + 2);
        this.voice.prefetchVerse(nextV2.text);
      }
    }

    // Điểm chuông gia trì (khánh ngân) ở các câu có đánh dấu bell: true (hoặc lần đầu của câu lặp 3 lần)
    if (!skipBell && startWordIndex === 0 && verse.bell && this.repeatRound === 0 && this.audio) {
      this.audio.playMeditationBell();
    }

    const displaySuffix =
      verse.repeatTotal > 1 ? ` (Lần ${this.repeatRound + 1}/${verse.repeatTotal})` : '';

    // Cập nhật giao diện cuộn kinh văn trên màn hình (chỉ hiển thị câu kinh sạch + tiến trình lần lặp)
    if (this.onVerseChange) {
      this.onVerseChange({
        sutraId: this.currentSutra.id,
        sutraTitle: this.currentSutra.title,
        verseIndex: this.verseIndex,
        totalVerses,
        text: verse.text,
        repeatRound: this.repeatRound + 1,
        repeatTotal: verse.repeatTotal,
        displaySuffix,
        wordIndex: startWordIndex,
        isVerseDone: false,
        isPaused: this.isPaused,
        meritEarned: this.currentSutra.meritPerVerse || 3
      });
    }

    // Đọc câu kinh đã loại bỏ "(3 lần)" và tự động lặp đủ số lần trước khi chuyển sang câu tiếp theo
    this.voice.speakVerse(
      verse.text,
      () => {
        if (
          activeSessionId !== this._chantSessionId ||
          !this.isChanting ||
          this.isPaused ||
          !this.isAuto
        ) {
          return;
        }

        // Báo hoàn thành 1 lượt đọc câu kinh để cộng Công Đức & nhân vật chắp tay cúi nhẹ
        if (this.onVerseChange) {
          this.onVerseChange({
            sutraId: this.currentSutra.id,
            sutraTitle: this.currentSutra.title,
            verseIndex: this.verseIndex,
            totalVerses,
            text: verse.text,
            repeatRound: this.repeatRound + 1,
            repeatTotal: verse.repeatTotal,
            displaySuffix,
            wordIndex: -1,
            isVerseDone: true,
            isPaused: this.isPaused,
            meritEarned: this.currentSutra.meritPerVerse || 3
          });
        }

        if (this.repeatRound + 1 < verse.repeatTotal) {
          // Đọc tiếp lần 2, lần 3 của câu kinh có ghi "(3 lần)"
          this.repeatRound++;
          if (this.audio) this.audio.playMeditationBell(0.45);
          this.nextVerseTimer = setTimeout(() => {
            if (activeSessionId === this._chantSessionId && this.isChanting && !this.isPaused) {
              this._readNextVerse(0);
            }
          }, 420);
        } else {
          // Đã đọc đủ số lần -> sang câu tiếp theo
          this.repeatRound = 0;
          this.verseIndex++;
          this.nextVerseTimer = setTimeout(() => {
            if (activeSessionId === this._chantSessionId && this.isChanting && !this.isPaused) {
              this._readNextVerse(0);
            }
          }, 450);
        }
      },
      ({ wordIndex }) => {
        if (
          activeSessionId !== this._chantSessionId ||
          !this.isChanting ||
          this.isPaused ||
          !this.isAuto
        ) {
          return;
        }
        if (this.onVerseChange) {
          this.onVerseChange({
            sutraId: this.currentSutra.id,
            sutraTitle: this.currentSutra.title,
            verseIndex: this.verseIndex,
            totalVerses,
            text: verse.text,
            repeatRound: this.repeatRound + 1,
            repeatTotal: verse.repeatTotal,
            displaySuffix,
            wordIndex,
            isVerseDone: false,
            isPaused: this.isPaused,
            meritEarned: this.currentSutra.meritPerVerse || 3
          });
        }
      },
      startWordIndex
    );
  }

  _prepareManualVerse() {
    if (!this.currentSutra || this.verseIndex >= this.currentSutra.verses.length) return;
    const verse = this._getVerseObject(this.verseIndex);
    this.currentVerseWords = verse.text.trim().split(/\s+/).filter(Boolean);
    this.manualWordIndex = 0;

    if (verse.bell && this.repeatRound === 0 && this.audio) {
      this.audio.playMeditationBell();
    }

    const displaySuffix =
      verse.repeatTotal > 1 ? ` (Lần ${this.repeatRound + 1}/${verse.repeatTotal})` : '';

    if (this.onVerseChange) {
      this.onVerseChange({
        sutraId: this.currentSutra.id,
        sutraTitle: this.currentSutra.title,
        verseIndex: this.verseIndex,
        totalVerses: this.currentSutra.verses.length,
        text: verse.text,
        repeatRound: this.repeatRound + 1,
        repeatTotal: verse.repeatTotal,
        displaySuffix,
        wordIndex: 0,
        isVerseDone: false,
        isPaused: this.isPaused,
        meritEarned: this.currentSutra.meritPerVerse || 3
      });
    }
  }

  /**
   * Chế độ Tự gõ mõ theo chữ (Manual Wooden Fish Tap):
   * Mỗi lần gõ mõ chuyển sang chữ tiếp theo; nếu câu có "(3 lần)" thì lặp lại đủ 3 lần trước khi sang câu mới.
   */
  manualKnockVerse() {
    if (!this.isChanting || !this.currentSutra) return;
    if (this.audio) {
      this.audio.playWoodenFish(0.75);
    }

    const verse = this._getVerseObject(this.verseIndex);
    const totalVerses = this.currentSutra.verses.length;

    // Tải trước (prefetch) 2 câu kinh tiếp theo để giọng đọc Neural phát liền mạch không độ trễ
    if (this.voice && typeof this.voice.prefetchVerse === 'function') {
      if (this.verseIndex + 1 < totalVerses) {
        const nextV1 = this._getVerseObject(this.verseIndex + 1);
        this.voice.prefetchVerse(nextV1.text);
      }
      if (this.verseIndex + 2 < totalVerses) {
        const nextV2 = this._getVerseObject(this.verseIndex + 2);
        this.voice.prefetchVerse(nextV2.text);
      }
    }
    if (this.currentVerseWords.length === 0) {
      this.currentVerseWords = verse.text.trim().split(/\s+/).filter(Boolean);
    }

    const displaySuffix =
      verse.repeatTotal > 1 ? ` (Lần ${this.repeatRound + 1}/${verse.repeatTotal})` : '';

    this.manualWordIndex += 2; // Mỗi tiếng mõ đọc 2 chữ cho nhịp nhàng

    if (this.manualWordIndex < this.currentVerseWords.length) {
      if (this.onVerseChange) {
        this.onVerseChange({
          sutraId: this.currentSutra.id,
          sutraTitle: this.currentSutra.title,
          verseIndex: this.verseIndex,
          totalVerses,
          text: verse.text,
          repeatRound: this.repeatRound + 1,
          repeatTotal: verse.repeatTotal,
          displaySuffix,
          wordIndex: this.manualWordIndex,
          isVerseDone: false,
          isPaused: this.isPaused,
          meritEarned: this.currentSutra.meritPerVerse || 3
        });
      }
    } else {
      // Đã gõ xong 1 lượt của câu kinh
      if (this.onVerseChange) {
        this.onVerseChange({
          sutraId: this.currentSutra.id,
          sutraTitle: this.currentSutra.title,
          verseIndex: this.verseIndex,
          totalVerses,
          text: verse.text,
          repeatRound: this.repeatRound + 1,
          repeatTotal: verse.repeatTotal,
          displaySuffix,
          wordIndex: this.currentVerseWords.length - 1,
          isVerseDone: true,
          isPaused: this.isPaused,
          meritEarned: this.currentSutra.meritPerVerse || 3
        });
      }

      if (this.repeatRound + 1 < verse.repeatTotal) {
        this.repeatRound++;
        this._prepareManualVerse();
      } else {
        this.repeatRound = 0;
        this.verseIndex++;
        if (this.verseIndex >= totalVerses) {
          if (this.audio) this.audio.playGreatBell();
          const finishedSutra = this.currentSutra;
          this.stop();
          if (this.onComplete) this.onComplete(finishedSutra);
        } else {
          this._prepareManualVerse();
        }
      }
    }
  }

  stop() {
    this._chantSessionId++;
    this.isChanting = false;
    this.isPaused = false;
    this.repeatRound = 0;
    if (this.woodenFishTimer) {
      clearInterval(this.woodenFishTimer);
      this.woodenFishTimer = null;
    }
    if (this.nextVerseTimer) {
      clearTimeout(this.nextVerseTimer);
      this.nextVerseTimer = null;
    }
    if (this.voice) {
      this.voice.stop();
    }
  }
}
