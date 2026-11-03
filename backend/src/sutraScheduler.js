// backend/src/sutraScheduler.js
const DEFAULT_SUTRA_ROTATION = [
  { id: 'bat-nha-tam-kinh', title: 'Bát Nhã Ba La Mật Đa Tâm Kinh', durationMs: 360000 },
  { id: 'chu-dai-bi-tam-yeu', title: 'Thiên Thủ Thiên Nhãn Đại Bi Tâm Đà La Ni', durationMs: 360000 },
  { id: 'kinh-tu-bi', title: 'Kinh Tâm Từ Bi (Metta Sutta)', durationMs: 300000 },
  { id: 'niem-phat-tu-tu', title: 'Pháp Âm Niệm Phật & Quán Âm Thánh Hiệu', durationMs: 300000 },
  { id: 'ke-hoi-huong', title: 'Kệ Phổ Hiền & Hồi Hướng Công Đức', durationMs: 300000 },
  { id: 'kinh-duoc-su', title: 'Kinh Dược Sư Lưu Ly Quang Như Lai (12 Đại Nguyện Cầu An)', durationMs: 360000 },
  { id: 'kinh-a-di-da', title: 'Kinh Phật Thuyết A Di Đà (Tịnh Độ Cực Lạc)', durationMs: 360000 },
  { id: 'kinh-pho-mon', title: 'Kinh Phổ Môn (Quán Thế Âm Bồ Tát Cứu Khổ)', durationMs: 300000 },
  { id: 'kinh-vu-lan', title: 'Kinh Vu Lan Báo Hiếu (Báo Ân Cha Mẹ)', durationMs: 300000 },
  { id: 'sam-hoi-sau-can', title: 'Nghi Thức Sám Hối Sáu Căn & Hồng Danh Chư Phật', durationMs: 300000 },
  { id: 'thap-chu', title: 'Thập Chú (Mười Chú Nhỏ Nhập Tâm Tịnh Độ)', durationMs: 300000 },
  { id: 'kinh-phap-cu', title: 'Kinh Pháp Cú Thiện Ngôn (Dhammapada Tinh Hoa)', durationMs: 300000 }
];

export class SutraScheduler {
  constructor(io) {
    this.io = io;
    this.rotationIndex = 0;
    this.activeSession = null;
    this.checkTimer = null;
    this.sessionEndTimer = null;
    this.lastTriggeredQuarter = -1;

    // Start initial global chanting session on boot so early users can experience it immediately
    this.triggerGlobalSession('bat-nha-tam-kinh');

    // Check every 10 seconds for the 15-minute quarter marks (:00, :15, :30, :45)
    this.checkTimer = setInterval(() => this._checkScheduleTick(), 10000);
    if (this.checkTimer.unref) this.checkTimer.unref();
  }

  _checkScheduleTick() {
    const now = new Date();
    const minutes = now.getMinutes();
    if (minutes % 15 === 0 && minutes !== this.lastTriggeredQuarter) {
      this.lastTriggeredQuarter = minutes;
      const nextSutra = DEFAULT_SUTRA_ROTATION[this.rotationIndex % DEFAULT_SUTRA_ROTATION.length];
      this.rotationIndex++;
      this.triggerGlobalSession(nextSutra.id);
    }
  }

  triggerGlobalSession(sutraId = 'bat-nha-tam-kinh') {
    const found =
      DEFAULT_SUTRA_ROTATION.find((s) => s.id === sutraId) || DEFAULT_SUTRA_ROTATION[0];

    const nowTs = Date.now();
    this.activeSession = {
      active: true,
      sutraId: found.id,
      sutraTitle: found.title,
      serverTimestamp: nowTs,
      expiresAt: nowTs + found.durationMs,
      bonusMultiplier: 2
    };

    if (this.sessionEndTimer) {
      clearTimeout(this.sessionEndTimer);
    }
    this.sessionEndTimer = setTimeout(() => {
      if (this.activeSession && Date.now() >= this.activeSession.expiresAt) {
        this.activeSession.active = false;
      }
    }, found.durationMs);
    if (this.sessionEndTimer.unref) this.sessionEndTimer.unref();

    if (this.io) {
      this.io.emit('global_sutra_start', this.activeSession);
      this.io.emit('zen_ticker', {
        type: 'GLOBAL_SUTRA',
        message: `☸️ Đã đến giờ Thời Khóa Đại Chúng! Mời quý đạo hữu về Bồ Đoàn Chánh Điện đồng tụng "${found.title}" (Nhân đôi x2 Công Đức)!`
      });
    }

    return this.activeSession;
  }

  isGlobalSessionActive() {
    if (!this.activeSession) return false;
    if (Date.now() > this.activeSession.expiresAt) {
      this.activeSession.active = false;
      return false;
    }
    return Boolean(this.activeSession.active);
  }

  getCurrentSessionInfo() {
    if (!this.isGlobalSessionActive()) {
      return { active: false };
    }
    return this.activeSession;
  }

  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    if (this.sessionEndTimer) {
      clearTimeout(this.sessionEndTimer);
      this.sessionEndTimer = null;
    }
  }
}
