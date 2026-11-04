// backend/test/church.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';

import { GraceBatcher, VIRTUE_THRESHOLDS, VIRTUE_TITLES } from '../src/graceBatcher.js';
import { ChurchRoomManager } from '../src/churchRoomManager.js';
import { LiturgyScheduler } from '../src/liturgyScheduler.js';
import { DEFAULT_DIOCESES, DEFAULT_SCRIPTURES, DEFAULT_PRAYERS } from '../src/db.js';
import { createTempleServer } from '../src/index.js';
import {
  PRAYER_LIBRARY,
  PRIEST_INVITATIONS,
  CATHOLIC_LITURGICAL_RITES,
  CHURCH_AVATAR_STYLES
} from '../../frontend/src/data/prayers.js';
import { SACRED_MUSIC_TRACKS } from '../../frontend/src/audio/SacredMusicPlayer.js';
import { LectorVoice, LECTOR_VOICE_PROFILES } from '../../frontend/src/audio/LectorVoice.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function waitForEvent(socket, eventName, timeoutMs = 6000, filterFn = null) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout waiting ${timeoutMs}ms for socket event: "${eventName}"`));
    }, timeoutMs);

    const handler = (data) => {
      if (filterFn && !filterFn(data)) return;
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve(data);
    };

    socket.on(eventName, handler);
  });
}

// ============================================================================
// SUITE 1: GRACE BATCHER (WRITE-BEHIND BATCHING & 9 VIRTUE TIERS)
// ============================================================================
describe('Church Suite 1: GraceBatcher (Write-Behind Batching & 9 Virtue Tiers)', () => {
  it('1.1 should verify 27 Dioceses, 10+ Scriptures, 5+ Canonical Prayers and 9 Virtue Tiers', () => {
    assert.strictEqual(DEFAULT_DIOCESES.length, 27, 'Must have all 27 Vietnamese Catholic Dioceses');
    assert.ok(DEFAULT_SCRIPTURES.length >= 10, 'Must have at least 10 daily Catholic scriptures');
    assert.ok(DEFAULT_PRAYERS.length >= 5, 'Must have at least 5 canonical Catholic prayers');
    assert.strictEqual(VIRTUE_THRESHOLDS.length, 9);
    assert.strictEqual(VIRTUE_TITLES.length, 9);
    assert.strictEqual(VIRTUE_TITLES[0], 'Tân Tòng Khởi Bước');
    assert.strictEqual(VIRTUE_TITLES[8], 'Hoa Thiêng Viên Mãn');
  });

  it('1.2 should accumulate grace deltas in RAM without immediate DB queries and promote Virtue Tiers', () => {
    let dbQueryCount = 0;
    const mockDb = {
      getConnection: async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
        query: async () => {
          dbQueryCount++;
          return [{ affectedRows: 1 }];
        }
      })
    };

    const tickerEvents = [];
    const mockIo = {
      emit: (evt, data) => {
        if (evt === 'grace_ticker') tickerEvents.push(data);
      }
    };

    const batcher = new GraceBatcher(mockDb, mockIo, 60000);
    const user = {
      id: 77,
      christianName: 'Giuse Nguyễn An',
      dioceseCode: 'SG',
      gracePoints: 95,
      rosariesCompleted: 0,
      gardenTended: 0,
      virtueTier: 1
    };

    // Add +10 grace -> total 105 (Crosses Tier 2 threshold: 100)
    const res1 = batcher.addGrace(user, 10);
    assert.strictEqual(dbQueryCount, 0);
    assert.strictEqual(user.gracePoints, 105);
    assert.strictEqual(res1.milestone, true);
    assert.strictEqual(user.virtueTier, 2);
    assert.strictEqual(batcher.userGraceBuffer.get(77), 10);
    assert.strictEqual(batcher.dioceseGraceBuffer.get('SG'), 10);
    assert.strictEqual(tickerEvents.length, 1);
    assert.strictEqual(tickerEvents[0].type, 'MILESTONE');
    assert.strictEqual(tickerEvents[0].virtueTitle, VIRTUE_TITLES[1]);

    batcher.stop();
  });

  it('1.3 should flush buffered grace deltas to nhatho_users and diocese_bouquets in a transaction', async () => {
    const executedQueries = [];
    const mockDb = {
      getConnection: async () => ({
        beginTransaction: async () => executedQueries.push('BEGIN'),
        commit: async () => executedQueries.push('COMMIT'),
        rollback: async () => executedQueries.push('ROLLBACK'),
        release: () => executedQueries.push('RELEASE'),
        query: async (sql, params) => {
          executedQueries.push({ sql, params });
          return [{ affectedRows: 1 }];
        }
      })
    };

    const batcher = new GraceBatcher(mockDb, null, 60000);
    const userA = { id: 1, christianName: 'Maria', dioceseCode: 'HN', gracePoints: 0, virtueTier: 1 };
    const userB = { id: 2, christianName: 'Phêrô', dioceseCode: 'XL', gracePoints: 0, virtueTier: 1 };

    batcher.addGrace(userA, 50, { rosariesDelta: 1 });
    batcher.addGrace(userB, 15, { gardenDelta: 3 });

    const flushRes = await batcher.flushToDatabase();
    assert.strictEqual(flushRes.flushedUsers, 2);
    assert.strictEqual(flushRes.flushedDioceses, 2);
    assert.strictEqual(batcher.userGraceBuffer.size, 0);
    assert.strictEqual(batcher.dioceseGraceBuffer.size, 0);
    assert.ok(executedQueries.includes('BEGIN'));
    assert.ok(executedQueries.includes('COMMIT'));

    batcher.stop();
  });
});

// ============================================================================
// SUITE 2: CHURCH ROOM MANAGER (AUTO SHARDING & ROSARY GARDEN TASKS)
// ============================================================================
describe('Church Suite 2: ChurchRoomManager (Auto Room Sharding & Rosary Garden)', () => {
  it('2.1 should shard 65 mock players: 1..60 into thanh-duong-1 and 61..65 into thanh-duong-2', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      emit: () => {}
    };
    const mockBatcher = {
      addGrace: (u, amt) => {
        u.gracePoints = (u.gracePoints || 0) + amt;
        return { gracePoints: u.gracePoints, amount: amt };
      }
    };

    const roomManager = new ChurchRoomManager(mockIo, mockBatcher, 60);

    for (let i = 1; i <= 65; i++) {
      const socket = {
        id: `church-sock-${i}`,
        join: () => {},
        leave: () => {},
        to: () => ({ emit: () => {} })
      };
      const user = {
        id: i,
        christianName: `Tín Hữu ${i}`,
        outfitColor: '#f5f0e6',
        dioceseCode: 'SG',
        gracePoints: 0,
        virtueTier: 1
      };
      const joinRes = roomManager.joinRoom(socket, user);
      if (i <= 60) {
        assert.strictEqual(joinRes.roomId, 'thanh-duong-1');
      } else {
        assert.strictEqual(joinRes.roomId, 'thanh-duong-2');
      }
    }

    const stats = roomManager.getStats();
    assert.strictEqual(stats.totalPlayers, 65);
    assert.strictEqual(stats.totalRooms, 2);
    roomManager.stop();
  });

  it('2.2 should spawn rose garden tasks in [-16, 16] x [10, 32] and tend without double-tending', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      emit: () => {}
    };
    const mockBatcher = {
      addGrace: (u, amt, opts) => {
        u.gracePoints = (u.gracePoints || 0) + amt;
        u.gardenTended = (u.gardenTended || 0) + (opts?.gardenDelta || 0);
        return { gracePoints: u.gracePoints, amount: amt };
      }
    };

    const roomManager = new ChurchRoomManager(mockIo, mockBatcher, 60);
    const socket = {
      id: 'gardener-sock',
      join: () => {},
      leave: () => {},
      to: () => ({ emit: () => {} })
    };
    const user = {
      id: 12,
      christianName: 'Têrêsa Hoa Hồng',
      dioceseCode: 'DL',
      gracePoints: 0,
      virtueTier: 1
    };

    const joinRes = roomManager.joinRoom(socket, user);
    const room = roomManager.rooms.get(joinRes.roomId);
    assert.ok(room.gardenTasks.size > 0);

    for (const task of room.gardenTasks.values()) {
      assert.ok(task.x >= -16 && task.x <= 16, `Task x=${task.x} must be in [-16, 16]`);
      assert.ok(task.z >= 10 && task.z <= 32, `Task z=${task.z} must be in [10, 32]`);
    }

    const targetTaskId = Array.from(room.gardenTasks.keys())[0];
    const tendResult = roomManager.tendGardenTask(socket.id, targetTaskId);
    assert.ok(tendResult);
    assert.strictEqual(tendResult.payload.taskId, targetTaskId);
    assert.strictEqual(tendResult.payload.reward, 5);
    assert.strictEqual(user.gracePoints, 5);
    assert.strictEqual(room.gardenTasks.has(targetTaskId), false);

    // Double tend prevention
    const doubleTend = roomManager.tendGardenTask(socket.id, targetTaskId);
    assert.strictEqual(doubleTend, null);

    roomManager.stop();
  });
});

// ============================================================================
// SUITE 3: LITURGY SCHEDULER
// ============================================================================
describe('Church Suite 3: LiturgyScheduler (Angelus, Divine Mercy & Rosary)', () => {
  it('3.1 should select Angelus at 6/12/18h, Divine Mercy at 15h, Night Prayer at 21h', () => {
    const scheduler = new LiturgyScheduler(null);
    assert.strictEqual(
      scheduler._selectPrayerForCurrentTime(new Date(2026, 4, 1, 6, 0, 0)),
      'kinh-truyen-tin-angelus'
    );
    assert.strictEqual(
      scheduler._selectPrayerForCurrentTime(new Date(2026, 4, 1, 12, 0, 0)),
      'kinh-truyen-tin-angelus'
    );
    assert.strictEqual(
      scheduler._selectPrayerForCurrentTime(new Date(2026, 4, 1, 15, 0, 0)),
      'chuoi-long-chua-thuong-xot'
    );
    assert.strictEqual(
      scheduler._selectPrayerForCurrentTime(new Date(2026, 4, 1, 18, 0, 0)),
      'kinh-truyen-tin-angelus'
    );
    assert.strictEqual(
      scheduler._selectPrayerForCurrentTime(new Date(2026, 4, 1, 21, 0, 0)),
      'kinh-toi-gia-dinh'
    );
    scheduler.stop();
  });
});

// ============================================================================
// SUITE 4: FULL END-TO-END SOCKET.IO & REST API INTEGRATION FOR NHÀ THỜ 3D
// ============================================================================
describe('Church Suite 4: Full End-to-End Socket.io & REST API Integration', () => {
  let serverInstance;
  let baseUrl;
  let client1;
  let client2;

  before(async () => {
    serverInstance = await createTempleServer({
      forceMemory: true,
      flushIntervalMs: 50000,
      maxRoomCapacity: 60
    });

    await new Promise((resolve) => {
      serverInstance.httpServer.listen(0, resolve);
    });

    const addr = serverInstance.httpServer.address();
    const port = typeof addr === 'object' && addr !== null ? addr.port : 3001;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (client1) client1.close();
    if (client2) client2.close();
    if (serverInstance) await serverInstance.close();
  });

  it('4.1 should serve all /api/nhatho/* REST endpoints and ?site=nhatho aliases', async () => {
    // GET /api/nhatho/health
    const healthRes = await fetch(`${baseUrl}/api/nhatho/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.status, 'ok');
    assert.strictEqual(healthJson.site, 'nhatho');
    assert.ok(Array.isArray(healthJson.rooms?.channels));

    // GET /api/nhatho/leaderboard
    const lbRes = await fetch(`${baseUrl}/api/nhatho/leaderboard`);
    assert.strictEqual(lbRes.status, 200);
    const lbJson = await lbRes.json();
    assert.strictEqual(lbJson.dioceses.length, 27);
    assert.ok(Array.isArray(lbJson.users));

    // GET /api/nhatho/scriptures/random
    const scRes = await fetch(`${baseUrl}/api/nhatho/scriptures/random`);
    assert.strictEqual(scRes.status, 200);
    const scJson = await scRes.json();
    assert.ok(scJson.theme_title && scJson.bible_verse && scJson.reference_book);

    // POST /api/nhatho/admin/trigger-liturgy
    const trigRes = await fetch(`${baseUrl}/api/nhatho/admin/trigger-liturgy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prayerId: 'kinh-man-coi-nam-su-vui' })
    });
    assert.strictEqual(trigRes.status, 200);
    const trigJson = await trigRes.json();
    assert.strictEqual(trigJson.ok, true);
    assert.strictEqual(trigJson.session.active, true);
    assert.strictEqual(trigJson.session.bonusMultiplier, 2);
  });

  it('4.2 should join church via /nhatho namespace and root / namespace and receive church_joined', async () => {
    client1 = ioClient(`${baseUrl}/nhatho`, { transports: ['websocket'], forceNew: true });
    client2 = ioClient(baseUrl, { transports: ['websocket'], forceNew: true });

    await Promise.all([
      waitForEvent(client1, 'connect'),
      waitForEvent(client2, 'connect')
    ]);

    const joinP1 = waitForEvent(client1, 'church_joined');
    client1.emit('join_church', {
      christianName: 'Giuse Trần Minh',
      dioceseCode: 'SG',
      outfitColor: '#f5f0e6'
    });
    const joinData1 = await joinP1;
    assert.strictEqual(joinData1.roomId, 'thanh-duong-1');
    assert.strictEqual(joinData1.user.christianName, 'Giuse Trần Minh');
    assert.ok(Array.isArray(joinData1.gardenTasks) && joinData1.gardenTasks.length > 0);
    assert.ok(joinData1.globalLiturgy?.active === true);

    const joinP2 = waitForEvent(client2, 'church_joined');
    client2.emit('join_church', {
      christianName: 'Maria Lê Thảo',
      dioceseCode: 'HN',
      outfitColor: '#e6ccb2'
    });
    const joinData2 = await joinP2;
    assert.strictEqual(joinData2.roomId, 'thanh-duong-1');
    assert.strictEqual(joinData2.user.christianName, 'Maria Lê Thảo');
  });

  it('4.3 should award x2 Hoa Thiêng on kneel_pew + click_rosary_bead, pray_verse, and complete_prayer', async () => {
    client1.emit('kneel_pew', { pewIndex: 0, x: 0, z: -7.2 });

    // 1. Click rosary bead (+2 during global liturgy on pew)
    const beadGraceP = waitForEvent(client1, 'grace_updated');
    client1.emit('click_rosary_bead', { beadIndex: 1 });
    const beadGrace = await beadGraceP;
    assert.strictEqual(beadGrace.delta, 2);
    assert.strictEqual(beadGrace.reason, 'ROSARY_BEAD');

    // 2. Pray verse (+6 during global liturgy on pew)
    const verseGraceP = waitForEvent(client1, 'grace_updated');
    client1.emit('pray_verse', { graceEarned: 3 });
    const verseGrace = await verseGraceP;
    assert.strictEqual(verseGrace.delta, 6);
    assert.strictEqual(verseGrace.reason, 'PRAY_VERSE');

    // 3. Complete prayer (+60 during global liturgy on pew)
    const completeGraceP = waitForEvent(client1, 'grace_updated');
    const tickerP = waitForEvent(
      client2,
      'grace_ticker',
      6000,
      (d) => d.type === 'PRAYER_COMPLETE'
    );
    client1.emit('complete_prayer', {
      prayerTitle: 'Chuỗi Mân Côi - Năm Sự Vui',
      completionBonus: 30
    });
    const [completeGrace, ticker] = await Promise.all([completeGraceP, tickerP]);
    assert.strictEqual(completeGrace.delta, 60);
    assert.strictEqual(completeGrace.rosariesCompleted, 1);
    assert.strictEqual(ticker.christianName, 'Giuse Trần Minh');
  });

  it('4.4 should tend garden, offer CANDLE/ROSE intentions, ring tower bell, genuflect, and draw scripture', async () => {
    const room = serverInstance.churchRoomManager.rooms.get('thanh-duong-1');
    const taskId = Array.from(room.gardenTasks.keys())[0];

    // 1. Tend garden
    const tendGraceP = waitForEvent(client1, 'grace_updated');
    client1.emit('tend_garden', { taskId });
    const tendGrace = await tendGraceP;
    assert.strictEqual(tendGrace.delta, 5);
    assert.strictEqual(tendGrace.reason, 'TEND_GARDEN');

    // 2. Offer CANDLE intention
    const candleGraceP = waitForEvent(client1, 'grace_updated');
    const newIntentionP = waitForEvent(client2, 'new_intention');
    client1.emit('offer_intention', {
      intentionType: 'CANDLE',
      content: 'Xin Chúa ban bình an cho gia đình con',
      posX: 1.5,
      posZ: -10
    });
    const [candleGrace, intention] = await Promise.all([candleGraceP, newIntentionP]);
    assert.strictEqual(candleGrace.delta, 10);
    assert.strictEqual(intention.intention_type, 'CANDLE');

    // 3. Ring tower bell
    const bellGraceP = waitForEvent(client1, 'grace_updated');
    const bellRungP = waitForEvent(client2, 'tower_bell_rung');
    client1.emit('ring_tower_bell');
    const [bellGrace, bellRung] = await Promise.all([bellGraceP, bellRungP]);
    assert.strictEqual(bellGrace.delta, 2);
    assert.strictEqual(bellRung.christianName, 'Giuse Trần Minh');

    // 4. Draw scripture
    const scDrawnP = waitForEvent(client1, 'scripture_drawn');
    client1.emit('draw_scripture');
    const scDrawn = await scDrawnP;
    assert.ok(scDrawn.bible_verse);

    // 5. Register & Login Catholic Account
    const regRes = await fetch(`${baseUrl}/api/nhatho/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recoveryCode: 'TINHUU-TEST-2026',
        christianName: 'Phêrô Nguyễn Văn Bình',
        password: 'amen2026',
        dioceseCode: 'SG'
      })
    });
    const regJson = await regRes.json();
    assert.strictEqual(regJson.ok, true);
    assert.strictEqual(regJson.user.christianName, 'Phêrô Nguyễn Văn Bình');

    const loginRes = await fetch(`${baseUrl}/api/nhatho/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'Phêrô Nguyễn Văn Bình',
        password: 'amen2026'
      })
    });
    const loginJson = await loginRes.json();
    assert.strictEqual(loginJson.ok, true);
    assert.strictEqual(loginJson.user.recoveryCode, 'TINHUU-TEST-2026');
  });

  it('4.5 should verify Catholic Choir music, Priest pastoral invitations, Liturgical rites, LectorVoice, and Sacred Artworks', () => {
    // 1. 8 Canonical Prayers
    assert.strictEqual(PRAYER_LIBRARY.length, 8);
    // 2. 4 Priest Invitations / Blessings
    assert.ok(PRIEST_INVITATIONS.length >= 4);
    assert.ok(PRIEST_INVITATIONS[0].text.includes('Nhân danh Cha và Con và Thánh Thần'));
    // 3. 5 Catholic Liturgical Rites
    assert.strictEqual(CATHOLIC_LITURGICAL_RITES.length, 5);
    // 4. 6 Catholic Avatar Styles (including Priest & Soeur)
    assert.strictEqual(CHURCH_AVATAR_STYLES.length, 6);
    // 5. Sacred Music Player tracks including Choir Polyphony & Pipe Organ
    assert.ok(SACRED_MUSIC_TRACKS.length >= 6);
    const choirTrack = SACRED_MUSIC_TRACKS.find((t) => t.id === 'choir_polyphonic_gloria');
    assert.ok(choirTrack, 'Must include 4-part Choir Polyphony & Pipe Organ track');
    assert.strictEqual(choirTrack.style, 'CHOIR_POLYPHONY');
    // 6. LectorVoice profiles & repeat instruction parser
    assert.strictEqual(LECTOR_VOICE_PROFILES.length, 4);
    assert.strictEqual(
      LectorVoice.stripRepeatInstruction('Vì cuộc khổ nạn đau thương của Chúa (3 lần)'),
      'Vì cuộc khổ nạn đau thương của Chúa'
    );
    assert.strictEqual(
      LectorVoice.parseRepeatCount('Lạy Chúa Giêsu, xin thương xót chúng con (3 lần)'),
      3
    );
    // 7. Verify all high-resolution Sacred Artworks exist and are non-empty JPEGs
    const artDir = path.resolve(__dirname, '../../frontend/public/nhatho/art');
    const requiredArtFiles = [
      'sacred_heart_jesus.jpg',
      'divine_mercy_jesus.jpg',
      'crucifixion_jesus.jpg',
      'virgin_mary_lourdes.jpg',
      'saint_joseph.jpg',
      'holy_family.jpg',
      'cha_truong_buu_diep.jpg',
      'pope_francis.jpg',
      'stained_glass_rose.jpg'
    ];
    for (const file of requiredArtFiles) {
      const fullPath = path.join(artDir, file);
      assert.ok(fs.existsSync(fullPath), `Sacred artwork ${file} must exist`);
      const stat = fs.statSync(fullPath);
      assert.ok(stat.size > 50000, `Sacred artwork ${file} must be high-res (>50KB)`);
    }
  });
});
