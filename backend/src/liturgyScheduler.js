// backend/src/liturgyScheduler.js
const DEFAULT_LITURGY_ROTATION = [
  {
    id: 'kinh-man-coi-nam-su-vui',
    title: 'Chuỗi Mân Côi - Năm Sự Vui (Kính Đức Mẹ)',
    durationMs: 360000
  },
  {
    id: 'kinh-truyen-tin-angelus',
    title: 'Kinh Truyền Tin (Angelus - Sáng / Trưa / Chiều)',
    durationMs: 300000
  },
  {
    id: 'chuoi-long-chua-thuong-xot',
    title: 'Chuỗi Kinh Lòng Chúa Thương Xót (Giờ 3 Giờ Chiều)',
    durationMs: 360000
  },
  {
    id: 'nam-dau-thanh-kinh-sang',
    title: 'Nghi Thức Đầu Thánh & Kinh Sáng',
    durationMs: 300000
  },
  {
    id: 'kinh-hoa-binh-thanh-phanxico',
    title: 'Kinh Hòa Bình (Thánh Phanxicô Assisi) & Kinh Tối',
    durationMs: 300000
  },
  {
    id: 'kinh-toi-gia-dinh',
    title: 'Kinh Tối Gia Đình & Kinh Phó Dâng',
    durationMs: 300000
  }
];

export class LiturgyScheduler {
  constructor(io) {
    this.io = io;
    this.rotationIndex = 0;
    this.activeSession = null;
    this.checkTimer = null;
    this.sessionEndTimer = null;
    this.lastTriggeredQuarter = -1;

    // Start initial global liturgy session on boot so early users experience communal prayer immediately
    this.triggerGlobalLiturgy('kinh-man-coi-nam-su-vui');

    // Check every 10 seconds for the 15-minute quarter marks (:00, :15, :30, :45)
    this.checkTimer = setInterval(() => this._checkScheduleTick(), 10000);
    if (this.checkTimer.unref) this.checkTimer.unref();
  }

  _emitGlobal(eventName, payload) {
    if (!this.io) return;
    if (typeof this.io.emit === 'function') {
      this.io.emit(eventName, payload);
    }
    if (typeof this.io.of === 'function') {
      try {
        this.io.of('/nhatho').emit(eventName, payload);
      } catch (_) {
        // Ignore if mock io
      }
    }
  }

  _selectPrayerForCurrentTime(now = new Date()) {
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (minutes === 0) {
      if (hours === 6 || hours === 12 || hours === 18) {
        return 'kinh-truyen-tin-angelus';
      }
      if (hours === 15) {
        return 'chuoi-long-chua-thuong-xot';
      }
      if (hours === 21) {
        return 'kinh-toi-gia-dinh';
      }
    }

    const nextPrayer =
      DEFAULT_LITURGY_ROTATION[this.rotationIndex % DEFAULT_LITURGY_ROTATION.length];
    this.rotationIndex++;
    return nextPrayer.id;
  }

  _checkScheduleTick() {
    const now = new Date();
    const minutes = now.getMinutes();
    if (minutes % 15 === 0 && minutes !== this.lastTriggeredQuarter) {
      this.lastTriggeredQuarter = minutes;
      const prayerId = this._selectPrayerForCurrentTime(now);
      this.triggerGlobalLiturgy(prayerId);
    }
  }

  triggerGlobalLiturgy(prayerId = 'kinh-man-coi-nam-su-vui') {
    const found =
      DEFAULT_LITURGY_ROTATION.find((p) => p.id === prayerId) || DEFAULT_LITURGY_ROTATION[0];

    const nowTs = Date.now();
    this.activeSession = {
      active: true,
      prayerId: found.id,
      prayerTitle: found.title,
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

    this._emitGlobal('global_liturgy_start', this.activeSession);
    this._emitGlobal('grace_ticker', {
      type: 'GLOBAL_LITURGY',
      prayerId: found.id,
      prayerTitle: found.title,
      message: `🔔 Chuông Tháp Nhà Thờ vừa ngân vang! Mời cộng đoàn tiến vào Hàng Ghế Quỳ Cung Thánh hiệp thông đọc "${found.title}" (Nhân đôi x2 Hoa Thiêng)!`
    });

    return this.activeSession;
  }

  isGlobalLiturgyActive() {
    if (!this.activeSession) return false;
    if (Date.now() > this.activeSession.expiresAt) {
      this.activeSession.active = false;
      return false;
    }
    return Boolean(this.activeSession.active);
  }

  getCurrentSessionInfo() {
    if (!this.isGlobalLiturgyActive()) {
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
