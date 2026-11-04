// backend/src/graceBatcher.js
export const VIRTUE_THRESHOLDS = [0, 100, 500, 1500, 5000, 15000, 50000, 150000, 500000];
export const VIRTUE_TITLES = [
  'Tân Tòng Khởi Bước',
  'Tín Hữu Chuyên Cần',
  'Người Gieo Hạt Lành',
  'Khí Cụ Bình An',
  'Chiến Sĩ Mân Côi',
  'Ngọn Nến Hiệp Thông',
  'Chứng Nhân Đức Tin',
  'Trụ Cột Giáo Đường',
  'Hoa Thiêng Viên Mãn'
];

export class GraceBatcher {
  constructor(dbPool, io, flushIntervalMs = 15000) {
    this.db = dbPool;
    this.io = io;
    this.userGraceBuffer = new Map();     // userId -> deltaGrace
    this.dioceseGraceBuffer = new Map();  // dioceseCode -> deltaGrace
    this.userStatsBuffer = new Map();     // userId -> { rosariesDelta, gardenDelta, virtueTier }
    this.isFlushing = false;

    // Tự động flush xuống MySQL mỗi 15 giây (Blueprint Write-Behind Batching)
    this.flushTimer = setInterval(() => {
      this.flushToDatabase().catch((err) =>
        console.error('[GraceBatcher] Interval flush error:', err)
      );
    }, flushIntervalMs);
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
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
        // Ignore if mock io does not support namespaces
      }
    }
  }

  addGrace(user, amount, options = {}) {
    if (!user || typeof amount !== 'number' || amount <= 0) return null;

    const rosariesDelta = Number(options.rosariesDelta || 0);
    const gardenDelta = Number(options.gardenDelta || 0);

    // 1. Cộng ngay vào biến session trên RAM để user thấy ngay lập tức
    user.gracePoints = (user.gracePoints || 0) + amount;
    user.rosariesCompleted = (user.rosariesCompleted || 0) + rosariesDelta;
    user.gardenTended = (user.gardenTended || 0) + gardenDelta;

    const uid = user.id;
    const dCode = user.dioceseCode || 'SG';

    this.userGraceBuffer.set(uid, (this.userGraceBuffer.get(uid) || 0) + amount);
    this.dioceseGraceBuffer.set(dCode, (this.dioceseGraceBuffer.get(dCode) || 0) + amount);

    // 2. Kiểm tra thăng cấp Bậc Hoa Thiêng (9 cấp bậc)
    const nextTier =
      VIRTUE_THRESHOLDS.findIndex(
        (t, idx) =>
          user.gracePoints >= t &&
          (!VIRTUE_THRESHOLDS[idx + 1] || user.gracePoints < VIRTUE_THRESHOLDS[idx + 1])
      ) + 1;

    let milestone = false;
    if (nextTier > (user.virtueTier || 1)) {
      user.virtueTier = nextTier;
      milestone = true;
      const virtueTitle = VIRTUE_TITLES[nextTier - 1] || `Bậc ${nextTier}`;

      // Thông báo toàn server qua Dải Lụa Hiệp Thông
      const tickerPayload = {
        type: 'MILESTONE',
        virtueTier: nextTier,
        virtueTitle,
        christianName: user.christianName,
        message: `✨ Tín hữu **${user.christianName}** vừa đạt bậc **${virtueTitle}**! Tạ ơn Chúa!`
      };
      this._emitGlobal('grace_ticker', tickerPayload);
    }

    const prevStats = this.userStatsBuffer.get(uid) || {
      rosariesDelta: 0,
      gardenDelta: 0,
      virtueTier: user.virtueTier || 1
    };
    this.userStatsBuffer.set(uid, {
      rosariesDelta: prevStats.rosariesDelta + rosariesDelta,
      gardenDelta: prevStats.gardenDelta + gardenDelta,
      virtueTier: Math.max(prevStats.virtueTier, user.virtueTier || 1)
    });

    return {
      gracePoints: user.gracePoints,
      virtueTier: user.virtueTier,
      virtueTitle: VIRTUE_TITLES[(user.virtueTier || 1) - 1] || VIRTUE_TITLES[0],
      milestone,
      amount
    };
  }

  async flushToDatabase() {
    if (this.isFlushing) {
      return { flushedUsers: 0, flushedDioceses: 0, skipped: true };
    }
    if (this.userGraceBuffer.size === 0 && this.dioceseGraceBuffer.size === 0) {
      return { flushedUsers: 0, flushedDioceses: 0 };
    }

    this.isFlushing = true;

    const userEntries = Array.from(this.userGraceBuffer.entries());
    const dioceseEntries = Array.from(this.dioceseGraceBuffer.entries());
    const statsSnapshot = new Map(this.userStatsBuffer);

    this.userGraceBuffer.clear();
    this.dioceseGraceBuffer.clear();
    this.userStatsBuffer.clear();

    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      for (const [userId, delta] of userEntries) {
        const st = statsSnapshot.get(userId) || {
          rosariesDelta: 0,
          gardenDelta: 0,
          virtueTier: 1
        };
        await conn.query(
          `UPDATE nhatho_users
           SET grace_points = grace_points + ?,
               rosaries_completed = rosaries_completed + ?,
               garden_tended = garden_tended + ?,
               virtue_tier = GREATEST(virtue_tier, ?)
           WHERE id = ?`,
          [delta, st.rosariesDelta, st.gardenDelta, st.virtueTier, userId]
        );
      }

      for (const [dioceseCode, delta] of dioceseEntries) {
        await conn.query(
          `UPDATE diocese_bouquets SET total_grace = total_grace + ? WHERE diocese_code = ?`,
          [delta, dioceseCode]
        );
      }

      await conn.commit();
      return {
        flushedUsers: userEntries.length,
        flushedDioceses: dioceseEntries.length
      };
    } catch (err) {
      await conn.rollback();

      // Re-queue uncommitted deltas back into buffers so zero grace points are lost on transient DB failure!
      for (const [userId, delta] of userEntries) {
        this.userGraceBuffer.set(userId, (this.userGraceBuffer.get(userId) || 0) + delta);
        const st = statsSnapshot.get(userId);
        if (st) {
          const cur = this.userStatsBuffer.get(userId) || {
            rosariesDelta: 0,
            gardenDelta: 0,
            virtueTier: 1
          };
          this.userStatsBuffer.set(userId, {
            rosariesDelta: cur.rosariesDelta + st.rosariesDelta,
            gardenDelta: cur.gardenDelta + st.gardenDelta,
            virtueTier: Math.max(cur.virtueTier, st.virtueTier)
          });
        }
      }
      for (const [dioceseCode, delta] of dioceseEntries) {
        this.dioceseGraceBuffer.set(
          dioceseCode,
          (this.dioceseGraceBuffer.get(dioceseCode) || 0) + delta
        );
      }

      console.error('[GraceBatcher] Flush error (deltas re-queued safely):', err);
      throw err;
    } finally {
      conn.release();
      this.isFlushing = false;
    }
  }

  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
