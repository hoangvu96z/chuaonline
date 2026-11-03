// frontend/src/audio/SutraChanter.js
export class SutraChanter {
  constructor(zenAudio, dharmaVoice, onVerseChange, onComplete) {
    this.audio = zenAudio;
    this.voice = dharmaVoice;
    this.onVerseChange = onVerseChange; // Callback cập nhật UI chữ Karaoke
    this.onComplete = onComplete;       // Callback cộng thưởng Công Đức khi tụng xong bài
    this.isChanting = false;
    this.isAuto = true;
    this.currentSutra = null;
    this.verseIndex = 0;
    this.woodenFishTimer = null;
    this.nextVerseTimer = null;
    this.manualWordIndex = 0;
    this.currentVerseWords = [];
  }

  startSutra(sutra, startIndex = 0) {
    this.stop();
    if (!sutra || !Array.isArray(sutra.verses) || sutra.verses.length === 0) return;

    this.isChanting = true;
    this.currentSutra = sutra;
    this.verseIndex = Math.max(0, Math.min(startIndex, sutra.verses.length - 1));

    // Thỉnh 1 tiếng chuông mở đầu bài kinh
    if (this.audio) {
      this.audio.playMeditationBell();
    }

    if (this.isAuto) {
      this._startAutoWoodenFish(sutra.tempoMs || 680);
      this._readNextVerse();
    } else {
      this._prepareManualVerse();
    }
  }

  _startAutoWoodenFish(tempoMs) {
    if (this.woodenFishTimer) clearInterval(this.woodenFishTimer);
    this.woodenFishTimer = setInterval(() => {
      if (this.isChanting && this.isAuto && this.audio) {
        this.audio.playWoodenFish(0.45); // Âm lượng mõ nền vừa phải để rõ giọng đọc kinh
      }
    }, tempoMs);
  }

  setAutoMode(isAuto) {
    const nextAuto = Boolean(isAuto);
    if (this.isAuto === nextAuto) return;
    this.isAuto = nextAuto;

    if (!this.isChanting || !this.currentSutra) return;

    if (this.isAuto) {
      this._startAutoWoodenFish(this.currentSutra.tempoMs || 680);
      this._readNextVerse();
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

  _getVerseObject(index) {
    const raw = this.currentSutra.verses[index];
    if (typeof raw === 'string') {
      return { text: raw, bell: index === 0 || index === this.currentSutra.verses.length - 1 };
    }
    return {
      text: raw?.text || '',
      bell: Boolean(raw?.bell)
    };
  }

  _readNextVerse() {
    if (!this.isChanting || !this.currentSutra) return;

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

    // Điểm chuông gia trì (khánh ngân) ở các câu có đánh dấu bell: true
    if (verse.bell && this.audio) {
      this.audio.playMeditationBell();
    }

    // Cập nhật giao diện cuộn kinh văn trên màn hình
    if (this.onVerseChange) {
      this.onVerseChange({
        sutraId: this.currentSutra.id,
        sutraTitle: this.currentSutra.title,
        verseIndex: this.verseIndex,
        totalVerses,
        text: verse.text,
        wordIndex: 0,
        isVerseDone: false,
        meritEarned: this.currentSutra.meritPerVerse || 3
      });
    }

    // Đọc câu kinh bằng giọng trầm ấm và tự động chuyển câu tiếp theo khi đọc xong
    this.voice.speakVerse(
      verse.text,
      () => {
        if (!this.isChanting || !this.isAuto) return;

        // Báo hoàn thành 1 câu kinh để cộng +3 Công Đức & nhân vật chắp tay cúi nhẹ
        if (this.onVerseChange) {
          this.onVerseChange({
            sutraId: this.currentSutra.id,
            sutraTitle: this.currentSutra.title,
            verseIndex: this.verseIndex,
            totalVerses,
            text: verse.text,
            wordIndex: -1,
            isVerseDone: true,
            meritEarned: this.currentSutra.meritPerVerse || 3
          });
        }

        this.verseIndex++;
        this.nextVerseTimer = setTimeout(() => this._readNextVerse(), 450); // Nghỉ lấy hơi 0.45s giữa 2 câu kinh
      },
      ({ wordIndex }) => {
        if (!this.isChanting || !this.isAuto) return;
        if (this.onVerseChange) {
          this.onVerseChange({
            sutraId: this.currentSutra.id,
            sutraTitle: this.currentSutra.title,
            verseIndex: this.verseIndex,
            totalVerses,
            text: verse.text,
            wordIndex,
            isVerseDone: false,
            meritEarned: this.currentSutra.meritPerVerse || 3
          });
        }
      }
    );
  }

  _prepareManualVerse() {
    if (!this.currentSutra || this.verseIndex >= this.currentSutra.verses.length) return;
    const verse = this._getVerseObject(this.verseIndex);
    this.currentVerseWords = verse.text.trim().split(/\s+/).filter(Boolean);
    this.manualWordIndex = 0;

    if (verse.bell && this.audio) {
      this.audio.playMeditationBell();
    }

    if (this.onVerseChange) {
      this.onVerseChange({
        sutraId: this.currentSutra.id,
        sutraTitle: this.currentSutra.title,
        verseIndex: this.verseIndex,
        totalVerses: this.currentSutra.verses.length,
        text: verse.text,
        wordIndex: 0,
        isVerseDone: false,
        meritEarned: this.currentSutra.meritPerVerse || 3
      });
    }
  }

  /**
   * Chế độ Tự gõ mõ theo chữ (Manual Wooden Fish Tap):
   * Mỗi lần gõ mõ chuyển sang chữ tiếp theo; hết câu tự sang câu mới và cộng Công Đức.
   */
  manualKnockVerse() {
    if (!this.isChanting || !this.currentSutra) return;
    if (this.audio) {
      this.audio.playWoodenFish(0.75);
    }

    const verse = this._getVerseObject(this.verseIndex);
    const totalVerses = this.currentSutra.verses.length;
    if (this.currentVerseWords.length === 0) {
      this.currentVerseWords = verse.text.trim().split(/\s+/).filter(Boolean);
    }

    this.manualWordIndex += 2; // Mỗi tiếng mõ đọc 2 chữ cho nhịp nhàng

    if (this.manualWordIndex < this.currentVerseWords.length) {
      if (this.onVerseChange) {
        this.onVerseChange({
          sutraId: this.currentSutra.id,
          sutraTitle: this.currentSutra.title,
          verseIndex: this.verseIndex,
          totalVerses,
          text: verse.text,
          wordIndex: this.manualWordIndex,
          isVerseDone: false,
          meritEarned: this.currentSutra.meritPerVerse || 3
        });
      }
    } else {
      // Đã gõ xong 1 câu kinh
      if (this.onVerseChange) {
        this.onVerseChange({
          sutraId: this.currentSutra.id,
          sutraTitle: this.currentSutra.title,
          verseIndex: this.verseIndex,
          totalVerses,
          text: verse.text,
          wordIndex: this.currentVerseWords.length - 1,
          isVerseDone: true,
          meritEarned: this.currentSutra.meritPerVerse || 3
        });
      }

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

  stop() {
    this.isChanting = false;
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
