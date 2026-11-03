// backend/src/meritBatcher.js
export const REALM_THRESHOLDS = [0, 100, 500, 1500, 5000, 15000, 50000, 150000, 500000];
export const REALM_NAMES = [
  'Sơ Tâm Nhập Đạo',
  'Tịnh Tâm Hành Giả',
  'Thiền Định Sơ Quả',
  'Minh Tâm Kiến Tánh',
  'Bát Nhã Trí Quang',
  'Kim Cang Bất Hoại',
  'Liên Hoa Hóa Sanh',
  'Bồ Đề Đạo Quả',
  'Viên Giác Đại Sư'
];

export class MeritBatcher {
  constructor(dbPool, io, flushIntervalMs = 15000) {
    this.db = dbPool;
    this.io = io;
    this.userMeritBuffer = new Map();     // userId -> deltaMerit
    this.provinceMeritBuffer = new Map(); // provinceCode -> deltaMerit
    this.userStatsBuffer = new Map();     // userId -> { sutrasDelta, leavesDelta, realmLevel }
    this.isFlushing = false;

    // Tự động flush xuống MySQL mỗi 15 giây (Blueprint Requirement #2)
    this.flushTimer = setInterval(() => {
      this.flushToDatabase().catch((err) => console.error('[MeritBatcher] Interval flush error:', err));
    }, flushIntervalMs);
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  addMerit(user, amount, options = {}) {
    if (!user || typeof amount !== 'number' || amount <= 0) return null;

    const sutrasDelta = Number(options.sutrasDelta || 0);
    const leavesDelta = Number(options.leavesDelta || 0);

    // 1. Cộng ngay vào biến session trên RAM để user thấy ngay lập tức
    user.meritPoints = (user.meritPoints || 0) + amount;
    user.sutrasCompleted = (user.sutrasCompleted || 0) + sutrasDelta;
    user.leavesSwept = (user.leavesSwept || 0) + leavesDelta;

    const uid = user.id;
    const pCode = user.provinceCode || 'SG';

    this.userMeritBuffer.set(uid, (this.userMeritBuffer.get(uid) || 0) + amount);
    this.provinceMeritBuffer.set(pCode, (this.provinceMeritBuffer.get(pCode) || 0) + amount);

    // 2. Kiểm tra đột phá Cảnh Giới (9 cảnh giới)
    const nextRealm =
      REALM_THRESHOLDS.findIndex(
        (t, idx) =>
          user.meritPoints >= t &&
          (!REALM_THRESHOLDS[idx + 1] || user.meritPoints < REALM_THRESHOLDS[idx + 1])
      ) + 1;

    let breakthrough = false;
    if (nextRealm > (user.realmLevel || 1)) {
      user.realmLevel = nextRealm;
      breakthrough = true;
      const realmTitle = REALM_NAMES[nextRealm - 1] || `Tầng ${nextRealm}`;

      // Thông báo toàn server qua thanh cuộn lụa vàng
      if (this.io) {
        this.io.emit('zen_ticker', {
          type: 'BREAKTHROUGH',
          realmLevel: nextRealm,
          realmTitle,
          dharmaName: user.dharmaName,
          message: `🪷 Đạo hữu "${user.dharmaName}" vừa chứng ngộ Cảnh Giới tầng ${nextRealm} (${realmTitle})! Công đức vô lượng!`
        });
      }
    }

    const prevStats = this.userStatsBuffer.get(uid) || {
      sutrasDelta: 0,
      leavesDelta: 0,
      realmLevel: user.realmLevel || 1
    };
    this.userStatsBuffer.set(uid, {
      sutrasDelta: prevStats.sutrasDelta + sutrasDelta,
      leavesDelta: prevStats.leavesDelta + leavesDelta,
      realmLevel: Math.max(prevStats.realmLevel, user.realmLevel || 1)
    });

    return {
      meritPoints: user.meritPoints,
      realmLevel: user.realmLevel,
      breakthrough,
      amount
    };
  }

  async flushToDatabase() {
    if (this.isFlushing) {
      return { flushedUsers: 0, flushedProvinces: 0, skipped: true };
    }
    if (this.userMeritBuffer.size === 0 && this.provinceMeritBuffer.size === 0) {
      return { flushedUsers: 0, flushedProvinces: 0 };
    }

    this.isFlushing = true;

    const userEntries = Array.from(this.userMeritBuffer.entries());
    const provinceEntries = Array.from(this.provinceMeritBuffer.entries());
    const statsSnapshot = new Map(this.userStatsBuffer);

    this.userMeritBuffer.clear();
    this.provinceMeritBuffer.clear();
    this.userStatsBuffer.clear();

    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      for (const [userId, delta] of userEntries) {
        const st = statsSnapshot.get(userId) || { sutrasDelta: 0, leavesDelta: 0, realmLevel: 1 };
        await conn.query(
          `UPDATE users
           SET merit_points = merit_points + ?,
               sutras_completed = sutras_completed + ?,
               leaves_swept = leaves_swept + ?,
               realm_level = GREATEST(realm_level, ?)
           WHERE id = ?`,
          [delta, st.sutrasDelta, st.leavesDelta, st.realmLevel, userId]
        );
      }

      for (const [provinceCode, delta] of provinceEntries) {
        await conn.query(
          `UPDATE province_merits SET total_merit = total_merit + ? WHERE province_code = ?`,
          [delta, provinceCode]
        );
      }

      await conn.commit();
      return {
        flushedUsers: userEntries.length,
        flushedProvinces: provinceEntries.length
      };
    } catch (err) {
      await conn.rollback();

      // Re-queue uncommitted deltas back into buffers so zero merit points are lost on transient DB failure!
      for (const [userId, delta] of userEntries) {
        this.userMeritBuffer.set(userId, (this.userMeritBuffer.get(userId) || 0) + delta);
        const st = statsSnapshot.get(userId);
        if (st) {
          const cur = this.userStatsBuffer.get(userId) || {
            sutrasDelta: 0,
            leavesDelta: 0,
            realmLevel: 1
          };
          this.userStatsBuffer.set(userId, {
            sutrasDelta: cur.sutrasDelta + st.sutrasDelta,
            leavesDelta: cur.leavesDelta + st.leavesDelta,
            realmLevel: Math.max(cur.realmLevel, st.realmLevel)
          });
        }
      }
      for (const [provinceCode, delta] of provinceEntries) {
        this.provinceMeritBuffer.set(
          provinceCode,
          (this.provinceMeritBuffer.get(provinceCode) || 0) + delta
        );
      }

      console.error('[MeritBatcher] Flush error (deltas re-queued safely):', err);
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
