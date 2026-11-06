// backend/test/temple.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';

// 1. Frontend data & audio modules
import {
  SUTRA_LIBRARY,
  PROSTRATION_VOWS,
  REALM_LEVELS,
  PROVINCES_LIST,
  getRealmInfo
} from '../../frontend/src/data/sutras.js';
import { SutraChanter } from '../../frontend/src/audio/SutraChanter.js';
import { DharmaVoice, VOICE_PROFILES } from '../../frontend/src/audio/DharmaVoice.js';
import { ZenMusicPlayer, ZEN_MUSIC_TRACKS } from '../../frontend/src/audio/ZenMusicPlayer.js';
import { sanitizeSensitiveChat } from '../src/socketHandlers.js';

// 2. Backend core modules
import { MeritBatcher, REALM_THRESHOLDS, REALM_NAMES } from '../src/meritBatcher.js';
import { RoomManager } from '../src/roomManager.js';
import { createTempleServer } from '../src/index.js';

// Helper to wait for a socket.io event with a timeout
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
// SUITE 1: FRONTEND DATA & AUDIO MODULES
// ============================================================================
describe('Suite 1: Frontend Data & Audio Modules', () => {
  it('1.1 should have all 31 full-length canonical sutras and mantras and 3 prostration vows with required properties and verses', () => {
    assert.strictEqual(SUTRA_LIBRARY.length, 31, 'SUTRA_LIBRARY must contain 31 full-length sutras and mantras');

    const expectedSutraIds = [
      'bat-nha-tam-kinh',
      'chu-dai-bi-tam-yeu',
      'chu-lang-nghiem-5-de',
      'kinh-tu-bi',
      'niem-phat-tu-tu',
      'ke-hoi-huong',
      'kinh-duoc-su',
      'kinh-a-di-da',
      'kinh-pho-mon',
      'kinh-vu-lan',
      'sam-hoi-sau-can',
      'thap-chu',
      'kinh-phap-cu',
      'kinh-dia-tang',
      'kinh-kim-cang',
      'kinh-phuoc-duc',
      'kinh-chuyen-phap-luan',
      'kinh-vo-luong-tho',
      'sam-quy-mang',
      'duoc-su-that-phat-sam-phap',
      'kinh-phap-hoa-quan-am',
      'kinh-lang-nghiem-tinh-yeu',
      'kinh-hoa-nghiem-tinh-hanh',
      'kinh-bat-dai-nhan-giac',
      'kinh-thap-thien-nghiep-dao',
      'quan-am-linh-cam-chan-ngon',
      'chu-vang-sanh-tinh-do',
      'chu-chuan-de-cat-tuong',
      'than-chu-duoc-su-12-dai-nguyen',
      'kinh-thap-nhi-nhan-duyen',
      'kinh-di-giao-tinh-yeu'
    ];

    for (const sutraId of expectedSutraIds) {
      const sutra = SUTRA_LIBRARY.find((s) => s.id === sutraId);
      assert.ok(sutra, `Sutra with ID "${sutraId}" must exist`);
      assert.ok(typeof sutra.title === 'string' && sutra.title.length > 0, `${sutraId} title missing`);
      assert.ok(Array.isArray(sutra.verses) && sutra.verses.length >= 15, `${sutraId} must be a full-length sutra with at least 15 verses`);
      assert.ok(typeof sutra.meritPerVerse === 'number' && sutra.meritPerVerse > 0, `${sutraId} meritPerVerse invalid`);
      assert.ok(typeof sutra.completionBonus === 'number' && sutra.completionBonus > 0, `${sutraId} completionBonus invalid`);
      assert.ok(typeof sutra.tempoMs === 'number' && sutra.tempoMs > 0, `${sutraId} tempoMs invalid`);

      for (const [vIdx, verse] of sutra.verses.entries()) {
        assert.ok(typeof verse.text === 'string' && verse.text.length > 0, `${sutraId} verse #${vIdx} text missing`);
        assert.strictEqual(typeof verse.bell, 'boolean', `${sutraId} verse #${vIdx} bell flag must be boolean`);
      }
    }

    // Verify PROSTRATION_VOWS
    assert.ok(Array.isArray(PROSTRATION_VOWS), 'PROSTRATION_VOWS must be an array');
    assert.strictEqual(PROSTRATION_VOWS.length, 3, 'PROSTRATION_VOWS must contain exactly 3 vows');
    for (let i = 0; i < 3; i++) {
      const vow = PROSTRATION_VOWS[i];
      assert.strictEqual(vow.order, i + 1, `Vow order must be ${i + 1}`);
      assert.ok(typeof vow.title === 'string' && vow.title.length > 0, `Vow #${i + 1} title missing`);
      assert.ok(typeof vow.target === 'string' && vow.target.length > 0, `Vow #${i + 1} target missing`);
      assert.ok(typeof vow.text === 'string' && vow.text.length > 0, `Vow #${i + 1} text missing`);
    }
  });

  it('1.2 should have exactly 63 Vietnam provinces and 9 cultivation realms', () => {
    // Provinces list
    assert.strictEqual(PROVINCES_LIST.length, 63, 'PROVINCES_LIST must contain 63 provinces');
    const provinceCodes = new Set(PROVINCES_LIST.map((p) => p.code));
    assert.strictEqual(provinceCodes.size, 63, 'All 63 province codes must be unique');
    assert.ok(provinceCodes.has('SG'), 'Must include SG (TP. Hồ Chí Minh)');
    assert.ok(provinceCodes.has('HN'), 'Must include HN (Hà Nội)');
    assert.ok(provinceCodes.has('DN'), 'Must include DN (Đà Nẵng)');

    // Realm levels
    assert.strictEqual(REALM_LEVELS.length, 9, 'REALM_LEVELS must contain 9 realms');
    for (let i = 0; i < 9; i++) {
      const realm = REALM_LEVELS[i];
      assert.strictEqual(realm.level, i + 1, `Realm level must match index ${i + 1}`);
      assert.ok(typeof realm.title === 'string' && realm.title.length > 0, `Realm ${i + 1} title missing`);
      assert.strictEqual(typeof realm.minMerit, 'number', `Realm ${i + 1} minMerit missing`);
      assert.ok(typeof realm.auraColor === 'string' && realm.auraColor.startsWith('#'), `Realm ${i + 1} auraColor missing`);
    }

    assert.strictEqual(REALM_LEVELS[0].minMerit, 0);
    assert.strictEqual(REALM_LEVELS[1].minMerit, 100);
    assert.strictEqual(REALM_LEVELS[2].minMerit, 500);
    assert.strictEqual(REALM_LEVELS[8].minMerit, 500000);
  });

  it('1.3 should correctly compute realm information via getRealmInfo()', () => {
    const realm0 = getRealmInfo(0);
    assert.strictEqual(realm0.level, 1);
    assert.strictEqual(realm0.title, 'Sơ Tâm Nhập Đạo');
    assert.strictEqual(realm0.progress, 0);

    const realm100 = getRealmInfo(100);
    assert.strictEqual(realm100.level, 2);
    assert.strictEqual(realm100.title, 'Tịnh Tâm Hành Giả');

    const realm300 = getRealmInfo(300);
    assert.strictEqual(realm300.level, 2);
    // (300 - 100) / (500 - 100) = 200 / 400 = 0.5
    assert.strictEqual(realm300.progress, 0.5);

    const realmMax = getRealmInfo(999999);
    assert.strictEqual(realmMax.level, 9);
    assert.strictEqual(realmMax.title, 'Viên Giác Đại Sư');
    assert.strictEqual(realmMax.nextMerit, null);
    assert.strictEqual(realmMax.progress, 1.0);
  });

  it('1.4 should run SutraChanter in Auto Mode properly', () => {
    let bellCount = 0;
    let fishCount = 0;
    let spokenVerse = null;
    let verseChanges = [];

    const mockAudio = {
      playMeditationBell: () => { bellCount++; },
      playWoodenFish: () => { fishCount++; },
      playGreatBell: () => {}
    };

    const mockVoice = {
      speakVerse: (text, onEnd, onWord) => {
        spokenVerse = text;
        if (onWord) onWord({ wordIndex: 0 });
      },
      stop: () => {}
    };

    const chanter = new SutraChanter(
      mockAudio,
      mockVoice,
      (info) => verseChanges.push(info),
      () => {}
    );

    const sutra = SUTRA_LIBRARY[0];
    chanter.startSutra(sutra);

    assert.strictEqual(chanter.isChanting, true);
    assert.strictEqual(chanter.isAuto, true);
    assert.strictEqual(chanter.currentSutra.id, sutra.id);
    assert.strictEqual(chanter.verseIndex, 0);
    assert.ok(bellCount >= 1, 'Meditation bell must ring at sutra start');
    assert.strictEqual(spokenVerse, sutra.verses[0].text);
    assert.ok(verseChanges.length > 0, 'onVerseChange must be called');

    chanter.stop();
    assert.strictEqual(chanter.isChanting, false);
    assert.strictEqual(chanter.woodenFishTimer, null);
  });

  it('1.5 should run SutraChanter in Manual Mode (manualKnockVerse)', () => {
    let fishKnocks = 0;
    let greatBellCount = 0;
    let completedSutra = null;
    let verseEvents = [];

    const mockAudio = {
      playMeditationBell: () => {},
      playWoodenFish: () => { fishKnocks++; },
      playGreatBell: () => { greatBellCount++; }
    };

    const mockVoice = {
      speakVerse: () => {},
      stop: () => {}
    };

    const chanter = new SutraChanter(
      mockAudio,
      mockVoice,
      (evt) => verseEvents.push(evt),
      (done) => { completedSutra = done; }
    );

    chanter.setAutoMode(false);
    assert.strictEqual(chanter.isAuto, false);

    // Test with short 5-verse sutra
    const sutra = SUTRA_LIBRARY[4]; // ke-hoi-huong (5 verses)
    chanter.startSutra(sutra);

    assert.strictEqual(chanter.isChanting, true);
    assert.strictEqual(chanter.verseIndex, 0);

    // Simulate wooden fish knocks to step through words and verses
    let maxKnocks = 400;
    while (chanter.isChanting && maxKnocks > 0) {
      chanter.manualKnockVerse();
      maxKnocks--;
    }

    assert.ok(fishKnocks > 0, 'Should have played wooden fish audio on manual knock');
    assert.strictEqual(chanter.isChanting, false, 'Chanting should finish after all verses');
    assert.ok(completedSutra, 'onComplete should be triggered');
    assert.strictEqual(completedSutra.id, sutra.id);
    assert.strictEqual(greatBellCount, 1, 'Great bell must ring upon completion');
  });

  it('1.6 should strip "(3 lần)" literal text and repeat the verse 3 full times, plus support pause/resume & voice profiles', () => {
    const dv = new DharmaVoice();
    assert.strictEqual(VOICE_PROFILES.length, 4, 'Must have 4 distinct voice profiles');
    const selectedProfile = dv.setVoiceProfile('SU_CO_THANH_NHA');
    assert.strictEqual(selectedProfile.id, 'SU_CO_THANH_NHA');
    assert.strictEqual(dv.currentProfileId, 'SU_CO_THANH_NHA');

    const rawVerse = 'Nam mô Bổn Sư Thích Ca Mâu Ni Phật. (3 lần)';
    assert.strictEqual(DharmaVoice.parseRepeatCount(rawVerse), 3);
    assert.strictEqual(
      DharmaVoice.stripRepeatInstruction(rawVerse),
      'Nam mô Bổn Sư Thích Ca Mâu Ni Phật.'
    );

    const spokenCalls = [];
    const mockAudio = {
      playMeditationBell: () => {},
      playWoodenFish: () => {},
      playGreatBell: () => {}
    };
    const mockVoice = {
      setVoiceProfile: (id) => ({ id, name: id }),
      speakVerse: (text, onEnd, onWord, opts) => {
        spokenCalls.push({ text, onEnd, onWord, opts });
      },
      pause: () => {},
      resume: () => {},
      stop: () => {}
    };

    const chanter = new SutraChanter(mockAudio, mockVoice, () => {}, () => {});
    const testSutra = {
      id: 'test-3-lan',
      title: 'Kinh Thử Nghiệm 3 Lần',
      meritPerVerse: 3,
      completionBonus: 30,
      verses: [{ text: 'Nam mô A Di Đà Phật. (3 lần)', durationMs: 1000 }]
    };

    chanter.startSutra(testSutra, 0);
    assert.strictEqual(spokenCalls.length, 1);
    assert.strictEqual(spokenCalls[0].text, 'Nam mô A Di Đà Phật.');
    assert.ok(!spokenCalls[0].text.includes('3 lần'), 'Must never read literal "(3 lần)"');
    assert.strictEqual(chanter.repeatRound, 0);

    // Switch voice profile mid-verse -> old onEnd callback must be invalidated and new speakVerse started
    const staleOnEnd = spokenCalls[0].onEnd;
    chanter.changeVoiceProfile('SU_CO_THANH_NHA');
    assert.strictEqual(spokenCalls.length, 2, 'Should trigger fresh speakVerse with new voice profile');
    if (staleOnEnd) staleOnEnd(); // Stale callback from canceled utterance must be ignored!
    assert.strictEqual(chanter.repeatRound, 0, 'Stale onEnd must not advance repeatRound');

    // Trigger active onEnd of Round 1 -> should advance repeatRound to 1 and remain on verseIndex 0
    if (spokenCalls[1].onEnd) spokenCalls[1].onEnd();
    assert.strictEqual(chanter.repeatRound, 1);
    assert.strictEqual(chanter.verseIndex, 0);

    // Test Pause / Resume & Reading Speed Multiplier (0.5x .. 1.8x)
    assert.strictEqual(chanter.togglePause(), true);
    assert.strictEqual(chanter.isPaused, true);
    assert.strictEqual(chanter.togglePause(), false);
    assert.strictEqual(chanter.isPaused, false);

    assert.strictEqual(dv.setSpeedMultiplier(1.35), 1.35);
    assert.strictEqual(dv.getSpeedMultiplier(), 1.35);
    assert.strictEqual(dv.setSpeedMultiplier(0.2), 0.5, 'Must clamp min speed multiplier to 0.5x');
    assert.strictEqual(dv.setSpeedMultiplier(3.0), 1.8, 'Must clamp max speed multiplier to 1.8x');

    // Test Voice Volume & Auto Wooden Fish Volume
    assert.strictEqual(dv.setVolume(1.25), 1.25);
    assert.strictEqual(dv.getVolume(), 1.25);
    assert.strictEqual(chanter.setAutoWoodenFishVolume(0.75), 0.75);
    assert.strictEqual(chanter.getAutoWoodenFishVolume(), 0.75);
    assert.strictEqual(
      DharmaVoice.stripRepeatInstruction('(Câu 1–5) Nam mô hắc ra đát na đa ra dạ da.'),
      'Nam mô hắc ra đát na đa ra dạ da.'
    );

    const plainWordMs = dv._computeWordDurationMs('Phật', 0.82);
    const commaWordMs = dv._computeWordDurationMs('Phật,', 0.82);
    const periodWordMs = dv._computeWordDurationMs('Phật.', 0.82);
    assert.ok(commaWordMs > plainWordMs, 'Comma-terminated word must include natural clause pause');
    assert.ok(periodWordMs > commaWordMs, 'Period-terminated word must include natural sentence pause');

    chanter.stop();
    assert.strictEqual(chanter.isChanting, false);
  });

  it('1.7 should verify ZenMusicPlayer tracks and YouTube ID extraction', () => {
    assert.strictEqual(ZEN_MUSIC_TRACKS.length, 5, 'ZEN_MUSIC_TRACKS must have 5 tracks');
    assert.strictEqual(
      ZenMusicPlayer.extractYoutubeId('https://www.youtube.com/watch?v=77ZozI0rw7w'),
      '77ZozI0rw7w'
    );
    assert.strictEqual(
      ZenMusicPlayer.extractYoutubeId('https://youtu.be/lFcSrYw-ARY'),
      'lFcSrYw-ARY'
    );
    assert.strictEqual(
      ZenMusicPlayer.extractYoutubeId('1ZYbU82GVz4'),
      '1ZYbU82GVz4'
    );
  });
});

// ============================================================================
// SUITE 2: MERIT BATCHER (WRITE-BEHIND BATCHING & 9 REALMS BREAKTHROUGH)
// ============================================================================
describe('Suite 2: MeritBatcher (Write-Behind Batching & 9 Realms Breakthrough)', () => {
  it('2.1 should accumulate deltas on RAM buffer without immediate DB queries', () => {
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

    const emitted = [];
    const mockIo = {
      emit: (evt, data) => emitted.push({ evt, data })
    };

    const batcher = new MeritBatcher(mockDb, mockIo, 60000);

    const user = {
      id: 88,
      dharmaName: 'Thích Tịnh Tuệ',
      provinceCode: 'HN',
      meritPoints: 0,
      sutrasCompleted: 0,
      leavesSwept: 0,
      realmLevel: 1
    };

    // Knock wooden fish 3 times
    batcher.addMerit(user, 1);
    batcher.addMerit(user, 1);
    batcher.addMerit(user, 1);

    assert.strictEqual(dbQueryCount, 0, 'No DB queries should occur during addMerit calls');
    assert.strictEqual(user.meritPoints, 3, 'User merit points in RAM should be updated immediately');
    assert.strictEqual(batcher.userMeritBuffer.get(88), 3, 'userMeritBuffer should accumulate 3 points');
    assert.strictEqual(batcher.provinceMeritBuffer.get('HN'), 3, 'provinceMeritBuffer should accumulate 3 points');

    batcher.stop();
  });

  it('2.2 should detect Realm Breakthroughs and emit zen_ticker events', () => {
    const mockDb = {
      getConnection: async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
        query: async () => [{ affectedRows: 1 }]
      })
    };

    const tickerEvents = [];
    const mockIo = {
      emit: (evt, data) => {
        if (evt === 'zen_ticker') tickerEvents.push(data);
      }
    };

    const batcher = new MeritBatcher(mockDb, mockIo, 60000);

    const user = {
      id: 99,
      dharmaName: 'Thích Quảng Đức',
      provinceCode: 'SG',
      meritPoints: 95,
      realmLevel: 1
    };

    // Add +10 merit -> total 105 (Crosses Realm 2 threshold: 100)
    const result1 = batcher.addMerit(user, 10);
    assert.strictEqual(result1.breakthrough, true);
    assert.strictEqual(result1.realmLevel, 2);
    assert.strictEqual(user.realmLevel, 2);

    assert.strictEqual(tickerEvents.length, 1);
    assert.strictEqual(tickerEvents[0].type, 'BREAKTHROUGH');
    assert.strictEqual(tickerEvents[0].realmLevel, 2);
    assert.strictEqual(tickerEvents[0].realmTitle, REALM_NAMES[1]);
    assert.strictEqual(tickerEvents[0].dharmaName, 'Thích Quảng Đức');

    // Add +400 merit -> total 505 (Crosses Realm 3 threshold: 500)
    const result2 = batcher.addMerit(user, 400);
    assert.strictEqual(result2.breakthrough, true);
    assert.strictEqual(result2.realmLevel, 3);
    assert.strictEqual(user.realmLevel, 3);

    assert.strictEqual(tickerEvents.length, 2);
    assert.strictEqual(tickerEvents[1].type, 'BREAKTHROUGH');
    assert.strictEqual(tickerEvents[1].realmLevel, 3);
    assert.strictEqual(tickerEvents[1].realmTitle, REALM_NAMES[2]);

    batcher.stop();
  });

  it('2.3 should flush all accumulated deltas to DB and clear buffers', async () => {
    const executedQueries = [];
    const mockDb = {
      getConnection: async () => ({
        beginTransaction: async () => { executedQueries.push('BEGIN'); },
        commit: async () => { executedQueries.push('COMMIT'); },
        rollback: async () => { executedQueries.push('ROLLBACK'); },
        release: () => { executedQueries.push('RELEASE'); },
        query: async (sql, params) => {
          executedQueries.push({ sql, params });
          return [{ affectedRows: 1 }];
        }
      })
    };

    const batcher = new MeritBatcher(mockDb, null, 60000);

    const userA = { id: 1, dharmaName: 'User A', provinceCode: 'SG', meritPoints: 0, realmLevel: 1 };
    const userB = { id: 2, dharmaName: 'User B', provinceCode: 'HN', meritPoints: 0, realmLevel: 1 };

    batcher.addMerit(userA, 50, { sutrasDelta: 1 });
    batcher.addMerit(userB, 20, { leavesDelta: 2 });

    assert.strictEqual(batcher.userMeritBuffer.size, 2);
    assert.strictEqual(batcher.provinceMeritBuffer.size, 2);

    const flushResult = await batcher.flushToDatabase();
    assert.strictEqual(flushResult.flushedUsers, 2);
    assert.strictEqual(flushResult.flushedProvinces, 2);

    // Buffers must be completely cleared
    assert.strictEqual(batcher.userMeritBuffer.size, 0);
    assert.strictEqual(batcher.provinceMeritBuffer.size, 0);
    assert.strictEqual(batcher.userStatsBuffer.size, 0);

    // Transaction was executed
    assert.ok(executedQueries.includes('BEGIN'));
    assert.ok(executedQueries.includes('COMMIT'));

    // Second flush should do nothing
    const secondFlush = await batcher.flushToDatabase();
    assert.strictEqual(secondFlush.flushedUsers, 0);
    assert.strictEqual(secondFlush.flushedProvinces, 0);

    batcher.stop();
  });
});

// ============================================================================
// SUITE 3: ROOM MANAGER (AUTO ROOM SHARDING & BANYAN LEAVES)
// ============================================================================
describe('Suite 3: RoomManager (Auto Room Sharding & Banyan Leaves)', () => {
  it('3.1 should shard 65 mock players: 1..60 into chanh-dien-1 and 61..65 into chanh-dien-2', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      emit: () => {}
    };

    const mockBatcher = {
      addMerit: (u, amt) => {
        u.meritPoints = (u.meritPoints || 0) + amt;
        return { meritPoints: u.meritPoints, amount: amt };
      }
    };

    // Initialize RoomManager with full 60 maxCapacity
    const roomManager = new RoomManager(mockIo, mockBatcher, 60);

    for (let i = 1; i <= 65; i++) {
      const socket = {
        id: `mock-sock-${i}`,
        join: () => {},
        leave: () => {},
        to: () => ({ emit: () => {} })
      };

      const user = {
        id: i,
        dharmaName: `Thiền Sinh ${i}`,
        robeColor: '#5c6b73',
        provinceCode: 'SG',
        meritPoints: 0,
        realmLevel: 1
      };

      const joinRes = roomManager.joinRoom(socket, user);

      if (i <= 60) {
        assert.strictEqual(
          joinRes.roomId,
          'chanh-dien-1',
          `Player #${i} must be placed in chanh-dien-1`
        );
      } else {
        assert.strictEqual(
          joinRes.roomId,
          'chanh-dien-2',
          `Player #${i} must automatically shard into chanh-dien-2`
        );
      }
    }

    const stats = roomManager.getStats();
    assert.strictEqual(stats.totalPlayers, 65);
    assert.strictEqual(stats.totalRooms, 2);

    const channel1 = stats.channels.find((c) => c.roomId === 'chanh-dien-1');
    const channel2 = stats.channels.find((c) => c.roomId === 'chanh-dien-2');

    assert.strictEqual(channel1.playersCount, 60);
    assert.strictEqual(channel2.playersCount, 5);

    roomManager.stop();
  });

  it('3.2 should spawn fallen leaves in [-15, 15] x [10, 30] and sweep without double-sweep', () => {
    const mockIo = {
      to: () => ({ emit: () => {} }),
      emit: () => {}
    };

    const mockBatcher = {
      addMerit: (u, amt, opts) => {
        u.meritPoints = (u.meritPoints || 0) + amt;
        u.leavesSwept = (u.leavesSwept || 0) + (opts?.leavesDelta || 0);
        return { meritPoints: u.meritPoints, amount: amt };
      }
    };

    const roomManager = new RoomManager(mockIo, mockBatcher, 60);

    const socket = {
      id: 'sweeper-sock',
      join: () => {},
      leave: () => {},
      to: () => ({ emit: () => {} })
    };

    const user = {
      id: 42,
      dharmaName: 'Tâm Quét Lá',
      provinceCode: 'SG',
      meritPoints: 0,
      realmLevel: 1
    };

    const joinRes = roomManager.joinRoom(socket, user);
    const room = roomManager.rooms.get(joinRes.roomId);

    assert.ok(room.leaves.size > 0, 'Room must have initial fallen leaves');

    // Verify leaf coordinate bounds around Banyan tree: x in [-15, 15], z in [10, 30]
    for (const leaf of room.leaves.values()) {
      assert.ok(leaf.x >= -15 && leaf.x <= 15, `Leaf ${leaf.id} x=${leaf.x} must be within [-15, 15]`);
      assert.ok(leaf.z >= 10 && leaf.z <= 30, `Leaf ${leaf.id} z=${leaf.z} must be within [10, 30]`);
      assert.ok(typeof leaf.rotation === 'number', 'Leaf must have rotation');
      assert.ok(typeof leaf.scale === 'number', 'Leaf must have scale');
    }

    const targetLeafId = Array.from(room.leaves.keys())[0];

    // Sweep leaf for +5 merit
    const sweepResult = roomManager.sweepLeaf(socket.id, targetLeafId);
    assert.ok(sweepResult, 'sweepLeaf must succeed');
    assert.strictEqual(sweepResult.payload.leafId, targetLeafId);
    assert.strictEqual(sweepResult.payload.reward, 5);
    assert.strictEqual(user.meritPoints, 5);
    assert.strictEqual(user.leavesSwept, 1);
    assert.strictEqual(room.leaves.has(targetLeafId), false, 'Leaf must be deleted from room Map');

    // Double sweep prevention: Sweeping same leaf ID again must return null!
    const doubleSweepResult = roomManager.sweepLeaf(socket.id, targetLeafId);
    assert.strictEqual(doubleSweepResult, null, 'Double sweeping same leafId must return null');

    roomManager.stop();
  });
});

// ============================================================================
// SUITE 4: FULL END-TO-END SOCKET.IO & REST API INTEGRATION
// ============================================================================
describe('Suite 4: Full End-to-End Socket.io & REST API Integration', () => {
  let serverInstance;
  let baseUrl;
  let client1;
  let client2;

  before(async () => {
    // Spin up server in forced In-Memory mode on ephemeral port
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

  it('4.1 should return expected REST API responses', async () => {
    // GET /api/health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.status, 'ok');
    assert.strictEqual(healthJson.dbMode, 'in-memory-fallback');
    assert.ok(Array.isArray(healthJson.rooms?.channels), 'channels array present');

    // GET /api/leaderboard
    const lbRes = await fetch(`${baseUrl}/api/leaderboard`);
    assert.strictEqual(lbRes.status, 200);
    const lbJson = await lbRes.json();
    assert.ok(Array.isArray(lbJson.provinces), 'provinces array present');
    assert.ok(Array.isArray(lbJson.users), 'users array present');

    // GET /api/fortunes/random
    const fortRes = await fetch(`${baseUrl}/api/fortunes/random`);
    assert.strictEqual(fortRes.status, 200);
    const fortJson = await fortRes.json();
    assert.ok(typeof fortJson.rank_title === 'string' && fortJson.rank_title.length > 0);
    assert.ok(typeof fortJson.poem === 'string' && fortJson.poem.length > 0);
    assert.ok(typeof fortJson.interpretation === 'string' && fortJson.interpretation.length > 0);

    // POST /api/admin/trigger-global-sutra
    const triggerRes = await fetch(`${baseUrl}/api/admin/trigger-global-sutra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sutraId: 'bat-nha-tam-kinh' })
    });
    assert.strictEqual(triggerRes.status, 200);
    const triggerJson = await triggerRes.json();
    assert.strictEqual(triggerJson.ok, true);
    assert.strictEqual(triggerJson.session.active, true);
    assert.strictEqual(triggerJson.session.sutraId, 'bat-nha-tam-kinh');
    assert.strictEqual(triggerJson.session.bonusMultiplier, 2);
  });

  it('4.2 should join temple and receive temple_joined payload', async () => {
    client1 = ioClient(baseUrl, { transports: ['websocket'], forceNew: true });
    client2 = ioClient(baseUrl, { transports: ['websocket'], forceNew: true });

    await Promise.all([
      waitForEvent(client1, 'connect'),
      waitForEvent(client2, 'connect')
    ]);

    // Client 1 joins temple
    const joinPromise1 = waitForEvent(client1, 'temple_joined');
    client1.emit('join_temple', {
      dharmaName: 'Thích Trí Thiền',
      provinceCode: 'HN',
      robeColor: '#5c6b73'
    });
    const joinData1 = await joinPromise1;

    assert.strictEqual(joinData1.roomId, 'chanh-dien-1');
    assert.strictEqual(joinData1.user.dharmaName, 'Thích Trí Thiền');
    assert.strictEqual(joinData1.user.provinceCode, 'HN');
    assert.ok(Array.isArray(joinData1.leaves) && joinData1.leaves.length > 0);
    assert.ok(Array.isArray(joinData1.wishes));
    assert.ok(joinData1.globalSutra?.active === true);

    // Client 2 joins temple
    const joinPromise2 = waitForEvent(client2, 'temple_joined');
    client2.emit('join_temple', {
      dharmaName: 'Thích Nữ Diệu Tâm',
      provinceCode: 'SG',
      robeColor: '#b27d26'
    });
    const joinData2 = await joinPromise2;

    assert.strictEqual(joinData2.roomId, 'chanh-dien-1');
    assert.strictEqual(joinData2.user.dharmaName, 'Thích Nữ Diệu Tâm');
  });

  it('4.3 should award x2 Merit on sit_cushion + knock_wooden_fish during active Global Sutra session', async () => {
    // Client 1 sits on cushion #0 in Chánh Điện
    client1.emit('sit_cushion', { cushionIndex: 0, x: 0, z: -7.2 });

    // Client 1 knocks wooden fish during active Global Sutra session
    const meritPromise = waitForEvent(client1, 'merit_updated');
    const knockBroadcastPromise = waitForEvent(client2, 'wooden_fish_knocked');

    client1.emit('knock_wooden_fish');

    const [meritData, knockBroadcast] = await Promise.all([
      meritPromise,
      knockBroadcastPromise
    ]);

    // Global multiplier should make delta = 2 (instead of normal 1)!
    assert.strictEqual(meritData.delta, 2, 'Must award x2 Merit (+2) during active Global Sutra session on cushion');
    assert.strictEqual(meritData.reason, 'WOODEN_FISH');
    assert.strictEqual(knockBroadcast.dharmaName, 'Thích Trí Thiền');
  });

  it('4.4 should chant verse and complete sutra with server-wide zen_ticker broadcast', async () => {
    // 1. Chant verse (base = 3, with cushion on global session = x2 = 6)
    const chantPromise = waitForEvent(client1, 'merit_updated');
    client1.emit('chant_verse', { meritEarned: 3 });
    const chantMerit = await chantPromise;

    assert.strictEqual(chantMerit.delta, 6, 'Must award x2 chant merit (3 * 2 = 6)');
    assert.strictEqual(chantMerit.reason, 'CHANT_VERSE');

    // 2. Complete full sutra (base = 30, with cushion on global session = x2 = 60)
    const completeMeritPromise = waitForEvent(client1, 'merit_updated');
    const tickerPromise = waitForEvent(client2, 'zen_ticker');

    client1.emit('complete_sutra', {
      sutraTitle: 'Bát Nhã Ba La Mật Đa Tâm Kinh',
      completionBonus: 30
    });

    const [completeMerit, tickerData] = await Promise.all([
      completeMeritPromise,
      tickerPromise
    ]);

    assert.strictEqual(completeMerit.delta, 60, 'Must award x2 completion bonus (30 * 2 = 60)');
    assert.strictEqual(completeMerit.reason, 'COMPLETE_SUTRA');
    assert.strictEqual(completeMerit.sutrasCompleted, 1);

    assert.strictEqual(tickerData.type, 'SUTRA_COMPLETE');
    assert.strictEqual(tickerData.dharmaName, 'Thích Trí Thiền');
    assert.strictEqual(tickerData.sutraTitle, 'Bát Nhã Ba La Mật Đa Tâm Kinh');
  });

  it('4.5 should sweep leaf and broadcast leaf_swept with +5 merit', async () => {
    const health = await (await fetch(`${baseUrl}/api/health`)).json();
    const stats = serverInstance.roomManager.getStats();
    const room = serverInstance.roomManager.rooms.get('chanh-dien-1');
    const leafId = Array.from(room.leaves.keys())[0];

    const meritPromise = waitForEvent(client1, 'merit_updated');
    const sweepBroadcastPromise = waitForEvent(client2, 'leaf_swept');

    client1.emit('sweep_leaf', { leafId });

    const [meritData, sweepData] = await Promise.all([
      meritPromise,
      sweepBroadcastPromise
    ]);

    assert.strictEqual(meritData.delta, 5);
    assert.strictEqual(meritData.reason, 'SWEEP_LEAF');
    assert.strictEqual(sweepData.leafId, leafId);
    assert.strictEqual(sweepData.reward, 5);
    assert.strictEqual(sweepData.dharmaName, 'Thích Trí Thiền');
  });

  it('4.6 should make wish with INCENSE and LANTERN awarding +10 merit and broadcasting new_wish', async () => {
    // 1. INCENSE wish
    const meritIncensePromise = waitForEvent(client1, 'merit_updated');
    const newWishPromise1 = waitForEvent(client2, 'new_wish');

    client1.emit('make_wish', {
      wishType: 'INCENSE',
      content: 'Cầu cho cha mẹ vạn thọ vô khương bình an',
      posX: 1.2,
      posZ: 10
    });

    const [incenseMerit, wish1] = await Promise.all([
      meritIncensePromise,
      newWishPromise1
    ]);

    assert.strictEqual(incenseMerit.delta, 10);
    assert.strictEqual(incenseMerit.reason, 'INCENSE');
    assert.strictEqual(wish1.wish_type, 'INCENSE');
    assert.strictEqual(wish1.content, 'Cầu cho cha mẹ vạn thọ vô khương bình an');

    // 2. LANTERN wish
    const meritLanternPromise = waitForEvent(client2, 'merit_updated');
    const newWishPromise2 = waitForEvent(client1, 'new_wish');

    client2.emit('make_wish', {
      wishType: 'LANTERN',
      content: 'Nguyện đem công đức hồi hướng muôn loài chúng sanh',
      posX: -2.0,
      posZ: 34
    });

    const [lanternMerit, wish2] = await Promise.all([
      meritLanternPromise,
      newWishPromise2
    ]);

    assert.strictEqual(lanternMerit.delta, 10);
    assert.strictEqual(lanternMerit.reason, 'LANTERN');
    assert.strictEqual(wish2.wish_type, 'LANTERN');
    assert.strictEqual(wish2.content, 'Nguyện đem công đức hồi hướng muôn loài chúng sanh');
  });

  it('4.7 should ring great bell with +2 merit and broadcast great_bell_rung', async () => {
    const meritPromise = waitForEvent(client1, 'merit_updated');
    const bellBroadcastPromise = waitForEvent(client2, 'great_bell_rung');

    client1.emit('ring_great_bell');

    const [meritData, bellData] = await Promise.all([
      meritPromise,
      bellBroadcastPromise
    ]);

    assert.strictEqual(meritData.delta, 2);
    assert.strictEqual(meritData.reason, 'GREAT_BELL');
    assert.strictEqual(bellData.dharmaName, 'Thích Trí Thiền');
  });

  it('4.8 should draw daily fortune and return a Buddhist poem', async () => {
    const fortunePromise = waitForEvent(client1, 'fortune_drawn');
    client1.emit('draw_fortune');
    const fortune = await fortunePromise;

    assert.ok(typeof fortune.rank_title === 'string' && fortune.rank_title.length > 0);
    assert.ok(typeof fortune.poem === 'string' && fortune.poem.length > 0);
    assert.ok(typeof fortune.interpretation === 'string' && fortune.interpretation.length > 0);
  });

  it('4.9 should handle prostrate_buddha (+5 merit or +10 in global session) and broadcast player_prostrated & zen_ticker on 3rd bow', async () => {
    // 1. First bow in active global session while sitting on cushion -> +10 merit
    client1.emit('sit_cushion', { cushionIndex: 2, x: 0, z: -7.2 });

    const meritPromise1 = waitForEvent(client1, 'merit_updated');
    const prostrateBroadcast1 = waitForEvent(client2, 'player_prostrated');

    client1.emit('prostrate_buddha', { bowNumber: 1 });

    const [merit1, bowBroadcast1] = await Promise.all([
      meritPromise1,
      prostrateBroadcast1
    ]);

    assert.strictEqual(merit1.delta, 10, 'Should award +10 merit during active global session on cushion');
    assert.strictEqual(merit1.reason, 'PROSTRATE_BUDDHA');
    assert.strictEqual(bowBroadcast1.dharmaName, 'Thích Trí Thiền');
    assert.strictEqual(bowBroadcast1.bowNumber, 1);

    // 2. Second bow
    const meritPromise2 = waitForEvent(client1, 'merit_updated');
    client1.emit('prostrate_buddha', { bowNumber: 2 });
    const merit2 = await meritPromise2;
    assert.strictEqual(merit2.delta, 10);

    // 3. Third bow triggers server-wide zen_ticker
    const meritPromise3 = waitForEvent(client1, 'merit_updated');
    const tickerPromise = waitForEvent(client2, 'zen_ticker', 6000, (d) => d?.type === 'PROSTRATION');

    client1.emit('prostrate_buddha', { bowNumber: 3 });

    const [merit3, tickerData] = await Promise.all([
      meritPromise3,
      tickerPromise
    ]);

    assert.strictEqual(merit3.delta, 10);
    assert.strictEqual(tickerData.type, 'PROSTRATION');
    assert.strictEqual(tickerData.dharmaName, 'Thích Trí Thiền');
    assert.ok(tickerData.message.includes('Tam Bái Đảnh Lễ Tam Bảo'));
  });

  it('4.10 should register a password-protected account and login via Dharma Name or Recovery Code', async () => {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recoveryCode: 'PHATTU-TEST-AUTH99',
        dharmaName: 'Thích Minh Đăng',
        password: 'amida108',
        provinceCode: 'DN',
        robeColor: '#b35c1e'
      })
    });
    assert.strictEqual(regRes.status, 200);
    const regJson = await regRes.json();
    assert.strictEqual(regJson.ok, true);
    assert.strictEqual(regJson.user.dharmaName, 'Thích Minh Đăng');
    assert.strictEqual(regJson.user.isRegistered, true);

    // Login with wrong password should fail with 401
    const wrongRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'Thích Minh Đăng',
        password: 'wrong-password'
      })
    });
    assert.strictEqual(wrongRes.status, 401);

    // Login with correct password & Dharma Name should succeed
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'Thích Minh Đăng',
        password: 'amida108'
      })
    });
    assert.strictEqual(loginRes.status, 200);
    const loginJson = await loginRes.json();
    assert.strictEqual(loginJson.ok, true);
    assert.strictEqual(loginJson.user.recoveryCode, 'PHATTU-TEST-AUTH99');
    assert.strictEqual(loginJson.user.provinceCode, 'DN');
  });

  it('4.11 should filter sensitive words in send_chat and broadcast chat_message to room', async () => {
    const unitCheck = sanitizeSensitiveChat('Chào đạo hữu đm nói chuyện fuck vcl nhé');
    assert.strictEqual(unitCheck.flagged, true);
    assert.ok(!unitCheck.cleaned.includes('đm'));
    assert.ok(!unitCheck.cleaned.includes('fuck'));
    assert.ok(!unitCheck.cleaned.includes('vcl'));
    assert.ok(unitCheck.cleaned.includes('***'));

    const chatPromise = waitForEvent(client2, 'chat_message');
    client1.emit('send_chat', { text: 'Nam Mô A Di Đà Phật đm' });
    const chatMsg = await chatPromise;

    assert.strictEqual(chatMsg.dharmaName, 'Thích Trí Thiền');
    assert.strictEqual(chatMsg.flagged, true);
    assert.strictEqual(chatMsg.text, 'Nam Mô A Di Đà Phật ***');

    // Verify persistent chat history REST endpoint returns the stored message
    const histRes = await fetch(`${baseUrl}/api/chat-history?roomId=chanh-dien-1`);
    assert.strictEqual(histRes.status, 200);
    const histJson = await histRes.json();
    assert.ok(Array.isArray(histJson.messages) && histJson.messages.length > 0);
    assert.ok(
      histJson.messages.some((m) => m.text === 'Nam Mô A Di Đà Phật ***' && m.dharmaName === 'Thích Trí Thiền'),
      'Persistent chat history must include the sanitized message'
    );
  });

  it('4.12 should award +8 merit on plant_bodhi_tree and +6 merit on feed_koi_fish', async () => {
    const meritTreePromise = waitForEvent(client1, 'merit_updated');
    const plantedBroadcastPromise = waitForEvent(client2, 'bodhi_tree_planted');
    client1.emit('plant_bodhi_tree', { wish: 'Cầu trí tuệ sáng suốt' });

    const [treeMerit, treeBroadcast] = await Promise.all([
      meritTreePromise,
      plantedBroadcastPromise
    ]);
    assert.strictEqual(treeMerit.delta, 8);
    assert.strictEqual(treeMerit.reason, 'PLANT_BODHI_TREE');
    assert.strictEqual(treeBroadcast.dharmaName, 'Thích Trí Thiền');

    const meritFishPromise = waitForEvent(client1, 'merit_updated');
    const fishBroadcastPromise = waitForEvent(client2, 'koi_fish_fed');
    client1.emit('feed_koi_fish');

    const [fishMerit, fishBroadcast] = await Promise.all([
      meritFishPromise,
      fishBroadcastPromise
    ]);
    assert.strictEqual(fishMerit.delta, 6);
    assert.strictEqual(fishMerit.reason, 'FEED_KOI_FISH');
    assert.strictEqual(fishBroadcast.dharmaName, 'Thích Trí Thiền');
  });

  it('4.13 should handle high-concurrency multi-user auto-sharding and new shrine prostrations', async () => {
    // 1. Simulate 75 concurrent users joining roomManager
    const mockBatcher = {
      addMerit: (u, amt) => {
        u.meritPoints = (u.meritPoints || 0) + amt;
        return { meritPoints: u.meritPoints, amount: amt };
      }
    };
    const ccuRoomMgr = new RoomManager(null, mockBatcher, 60);

    for (let i = 1; i <= 75; i++) {
      const mockSock = {
        id: `ccu-sock-${i}`,
        join: () => {},
        leave: () => {},
        to: () => ({ emit: () => {} })
      };
      const user = {
        id: 3000 + i,
        dharmaName: `Phật Tử #${i}`,
        robeColor: '#5c6b73',
        avatarStyle: i % 2 === 0 ? 'SU_THAY_AO_NAU' : 'CU_SI_AO_LAM',
        provinceCode: 'SG',
        meritPoints: 0,
        realmLevel: 1
      };
      const joinRes = ccuRoomMgr.joinRoom(mockSock, user);
      if (i <= 60) {
        assert.strictEqual(joinRes.roomId, 'chanh-dien-1', `User #${i} must join chanh-dien-1`);
      } else {
        assert.strictEqual(joinRes.roomId, 'chanh-dien-2', `User #${i} must shard into chanh-dien-2`);
      }
      assert.strictEqual(joinRes.player.avatarStyle, user.avatarStyle);
    }

    const ccuStats = ccuRoomMgr.getStats();
    assert.strictEqual(ccuStats.channels.find((c) => c.roomId === 'chanh-dien-1').playersCount, 60);
    assert.strictEqual(ccuStats.channels.find((c) => c.roomId === 'chanh-dien-2').playersCount, 15);

    // Verify expanded courtyard movement bounds (x = -28, z = 14.5)
    const moved = ccuRoomMgr.updatePlayerMove('ccu-sock-1', { x: -28, z: 14.5 });
    assert.strictEqual(moved.x, -28);
    assert.strictEqual(moved.z, 14.5);
    ccuRoomMgr.stop();

    // 2. Prostration to new shrines: DI_LAC, DIA_TANG, BAO_THAP (+5 merit each outside cushion)
    client1.emit('change_state', { state: 'IDLE', cushionIndex: null });

    // 2a. DI_LAC shrine
    const meritDiLacPromise = waitForEvent(client1, 'merit_updated');
    const prostrateDiLacPromise = waitForEvent(client2, 'player_prostrated');
    client1.emit('prostrate_buddha', { target: 'DI_LAC', bowNumber: 1 });
    const [mDiLac, pDiLac] = await Promise.all([meritDiLacPromise, prostrateDiLacPromise]);
    assert.strictEqual(mDiLac.delta, 5);
    assert.strictEqual(mDiLac.reason, 'PROSTRATE_BUDDHA');
    assert.strictEqual(pDiLac.target, 'DI_LAC');
    assert.strictEqual(pDiLac.dharmaName, 'Thích Trí Thiền');

    // 2b. DIA_TANG shrine
    const meritDiaTangPromise = waitForEvent(client1, 'merit_updated');
    const prostrateDiaTangPromise = waitForEvent(client2, 'player_prostrated');
    client1.emit('prostrate_buddha', { target: 'DIA_TANG', bowNumber: 1 });
    const [mDiaTang, pDiaTang] = await Promise.all([meritDiaTangPromise, prostrateDiaTangPromise]);
    assert.strictEqual(mDiaTang.delta, 5);
    assert.strictEqual(mDiaTang.reason, 'PROSTRATE_BUDDHA');
    assert.strictEqual(pDiaTang.target, 'DIA_TANG');

    // 2c. BAO_THAP shrine
    const meritBaoThapPromise = waitForEvent(client1, 'merit_updated');
    const prostrateBaoThapPromise = waitForEvent(client2, 'player_prostrated');
    client1.emit('prostrate_buddha', { target: 'BAO_THAP', bowNumber: 1 });
    const [mBaoThap, pBaoThap] = await Promise.all([meritBaoThapPromise, prostrateBaoThapPromise]);
    assert.strictEqual(mBaoThap.delta, 5);
    assert.strictEqual(mBaoThap.reason, 'PROSTRATE_BUDDHA');
    assert.strictEqual(pBaoThap.target, 'BAO_THAP');

    // 3. Plant Bodhi tree and send chat, then verify newly joining client receives them
    const testWish = `Ươm mầm Bồ Đề #${Date.now()}`;
    const plantTreePromise = waitForEvent(client1, 'merit_updated');
    client1.emit('plant_bodhi_tree', { wish: testWish });
    await plantTreePromise;

    // Wait 200ms to clear send_chat anti-spam cooldown (150ms)
    await new Promise((r) => setTimeout(r, 200));

    const testChat = `A Di Đà Phật từ bi #${Date.now()}`;
    const chatPromise = waitForEvent(client2, 'chat_message');
    client1.emit('send_chat', { text: testChat });
    await chatPromise;

    // Connect real client3 to verify plantedTrees and chatHistory in temple_joined
    const client3 = ioClient(baseUrl, { transports: ['websocket'], forceNew: true });
    await waitForEvent(client3, 'connect');
    const joinPromise3 = waitForEvent(client3, 'temple_joined');
    client3.emit('join_temple', {
      dharmaName: 'Thích Huệ Minh',
      provinceCode: 'CT',
      avatarStyle: 'NHA_SU_AO_VANG'
    });
    const joinData3 = await joinPromise3;

    assert.ok(Array.isArray(joinData3.plantedTrees), 'plantedTrees must be an array');
    assert.ok(
      joinData3.plantedTrees.some((t) => t.wish === testWish),
      'Newly joined client must receive the planted tree in plantedTrees'
    );

    assert.ok(Array.isArray(joinData3.chatHistory), 'chatHistory must be an array');
    assert.ok(
      joinData3.chatHistory.some((c) => c.text === testChat),
      'Newly joined client must receive recent chat message in chatHistory'
    );

    client3.disconnect();
  });
});
