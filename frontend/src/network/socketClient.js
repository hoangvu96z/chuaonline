// frontend/src/network/socketClient.js
import { io } from 'socket.io-client';

const MOVE_THROTTLE_MS = 100; // Blueprint Requirement #3: Max 10 times/second (100ms/packet)

export class SocketClient {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.socket = null;
    this.connected = false;
    this.lastMoveSentAt = 0;
    this.pendingMoveTimer = null;
    this.latestMovePayload = null;
    this.userProfile = {};
  }

  connect(userProfile = {}) {
    this.userProfile = { ...userProfile };
    const backendUrl =
      import.meta.env?.VITE_BACKEND_URL ||
      (window.location.port === '5173' || window.location.port === '4173'
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : window.location.hostname.includes('vunph.io.vn')
          ? 'https://api.vunph.io.vn'
          : window.location.origin);

    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 20
    });

    this.socket.on('connect', () => {
      this.connected = true;
      if (this.handlers.onConnect) {
        this.handlers.onConnect(this.socket.id);
      }
      this.socket.emit('join_temple', this.userProfile);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      if (this.handlers.onDisconnect) {
        this.handlers.onDisconnect();
      }
    });

    // Initial welcome state from RoomManager
    this.socket.on('temple_joined', (data) => {
      if (this.handlers.onTempleJoined) this.handlers.onTempleJoined(data);
    });

    // 10Hz (100ms) server room state broadcast
    this.socket.on('room_state_tick', (payload) => {
      if (this.handlers.onRoomStateTick) this.handlers.onRoomStateTick(payload);
    });

    this.socket.on('player_joined', (player) => {
      if (this.handlers.onPlayerJoined) this.handlers.onPlayerJoined(player);
    });

    this.socket.on('player_left', (data) => {
      if (this.handlers.onPlayerLeft) this.handlers.onPlayerLeft(data);
    });

    // Merit & Realm updates
    this.socket.on('merit_updated', (data) => {
      if (this.handlers.onMeritUpdated) this.handlers.onMeritUpdated(data);
    });

    this.socket.on('wooden_fish_knocked', (data) => {
      if (this.handlers.onWoodenFishKnocked) this.handlers.onWoodenFishKnocked(data);
    });

    this.socket.on('player_prostrated', (data) => {
      if (this.handlers.onPlayerProstrated) this.handlers.onPlayerProstrated(data);
    });

    // Fallen Banyan Leaves spawn & sweep events
    this.socket.on('leaves_spawned', (data) => {
      if (this.handlers.onLeavesSpawned) this.handlers.onLeavesSpawned(data);
    });

    this.socket.on('leaf_swept', (data) => {
      if (this.handlers.onLeafSwept) this.handlers.onLeafSwept(data);
    });

    // Global Server-Synced Chanting (Thời Khóa Đại Chúng mỗi 15 phút)
    this.socket.on('global_sutra_start', (data) => {
      if (this.handlers.onGlobalSutraStart) this.handlers.onGlobalSutraStart(data);
    });

    this.socket.on('global_sutra_status', (data) => {
      if (this.handlers.onGlobalSutraStatus) this.handlers.onGlobalSutraStatus(data);
    });

    // Top Zen Ticker (Thanh Lụa Thông Báo toàn server)
    this.socket.on('zen_ticker', (data) => {
      if (this.handlers.onZenTicker) this.handlers.onZenTicker(data);
    });

    // Wishes (Incense & Lotus Lantern)
    this.socket.on('new_wish', (wish) => {
      if (this.handlers.onNewWish) this.handlers.onNewWish(wish);
    });

    // Great Bell rung
    this.socket.on('great_bell_rung', (data) => {
      if (this.handlers.onGreatBellRung) this.handlers.onGreatBellRung(data);
    });

    // Fortune drawn result
    this.socket.on('fortune_drawn', (fortune) => {
      if (this.handlers.onFortuneDrawn) this.handlers.onFortuneDrawn(fortune);
    });

    // Leaderboard data
    this.socket.on('leaderboard_data', (data) => {
      if (this.handlers.onLeaderboardData) this.handlers.onLeaderboardData(data);
    });

    // Real-time Multi-User Chat
    this.socket.on('chat_message', (msg) => {
      if (this.handlers.onChatMessage) this.handlers.onChatMessage(msg);
    });

    // Bodhi Tree planted & Koi Fish fed events
    this.socket.on('bodhi_tree_planted', (data) => {
      if (this.handlers.onBodhiTreePlanted) this.handlers.onBodhiTreePlanted(data);
    });

    this.socket.on('koi_fish_fed', (data) => {
      if (this.handlers.onKoiFishFed) this.handlers.onKoiFishFed(data);
    });

    this.socket.on('coop_goal_updated', (data) => {
      if (this.handlers.onCoopGoalUpdated) this.handlers.onCoopGoalUpdated(data);
    });

    this.socket.on('mandala_flower_rain', (data) => {
      if (this.handlers.onMandalaFlowerRain) this.handlers.onMandalaFlowerRain(data);
    });

    this.socket.on('life_released', (data) => {
      if (this.handlers.onLifeReleased) this.handlers.onLifeReleased(data);
    });

    this.socket.on('account_synced', (data) => {
      if (this.handlers.onAccountSynced) this.handlers.onAccountSynced(data);
    });
  }

  /**
   * Blueprint Requirement #3: Tick-Rate Throttling (Max 10 packets/second = 100ms interval)
   */
  sendMove(x, z, rotY = 0, state = 'WALK', cushionIndex = null) {
    if (!this.socket || !this.connected) return;
    this.latestMovePayload = { x, z, rotY, state, cushionIndex };

    const now = performance.now();
    const elapsed = now - this.lastMoveSentAt;

    if (elapsed >= MOVE_THROTTLE_MS) {
      this.lastMoveSentAt = now;
      this.socket.emit('move', this.latestMovePayload);
      if (this.pendingMoveTimer) {
        clearTimeout(this.pendingMoveTimer);
        this.pendingMoveTimer = null;
      }
    } else if (!this.pendingMoveTimer) {
      this.pendingMoveTimer = setTimeout(() => {
        this.pendingMoveTimer = null;
        this.lastMoveSentAt = performance.now();
        if (this.socket && this.connected && this.latestMovePayload) {
          this.socket.emit('move', this.latestMovePayload);
        }
      }, MOVE_THROTTLE_MS - elapsed);
    }
  }

  sendStateChange(state, cushionIndex = null) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('change_state', { state, cushionIndex });
  }

  sitCushion(cushionIndex, x, z) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('sit_cushion', { cushionIndex, x, z });
  }

  knockWoodenFish() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('knock_wooden_fish', { timestamp: Date.now() });
  }

  prostrateBuddha(bowNumber = 1, target = 'BUDDHA', rotY = Math.PI, bowProgressText = '') {
    if (!this.socket || !this.connected) return;
    this.socket.emit('prostrate_buddha', { bowNumber, target, rotY, bowProgressText, timestamp: Date.now() });
  }

  prayBeadsStep(completedRound = false, beadLabel = 'Tràng Hạt Bồ Đề 108 Hạt') {
    if (!this.socket || !this.connected) return;
    this.socket.emit('pray_beads_step', { completedRound, beadLabel });
  }

  updateBowProgress(bowProgressText = '', completedChallenge = false, totalBows = 108) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('update_bow_progress', { bowProgressText, completedChallenge, totalBows });
  }

  releaseLife(animalType = 'SPARROW', wishText = 'Nguyện chúng sanh bình an, giải trừ oán kết') {
    if (!this.socket || !this.connected) return;
    this.socket.emit('release_life', { animalType, wishText });
  }

  claimDailyReward(rewardType = 'QUEST', bonusMerit = 15, meta = {}) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('claim_daily_reward', { rewardType, bonusMerit, ...meta });
  }

  sendChat(text, meta = {}) {
    if (!this.socket) return;
    this.socket.emit('send_chat', {
      text,
      dharmaName: meta.dharmaName,
      provinceCode: meta.provinceCode,
      roomId: meta.roomId
    });
  }

  plantBodhiTree(wish = 'Ươm mầm Bồ Đề, gieo duyên giác ngộ') {
    if (!this.socket || !this.connected) return;
    this.socket.emit('plant_bodhi_tree', { wish });
  }

  feedKoiFish() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('feed_koi_fish', { timestamp: Date.now() });
  }

  chantVerse(sutraId, verseIndex, meritEarned = 3) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('chant_verse', { sutraId, verseIndex, meritEarned });
  }

  completeSutra(sutraId, sutraTitle, completionBonus = 30) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('complete_sutra', { sutraId, sutraTitle, completionBonus });
  }

  sweepLeaf(leafId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('sweep_leaf', { leafId });
  }

  makeWish(wishType, content, posX = 0, posZ = 34) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('make_wish', { wishType, content, posX, posZ });
  }

  ringGreatBell(wishText = 'Cầu quốc thái dân an, mưa thuận gió hòa') {
    if (!this.socket || !this.connected) return;
    this.socket.emit('ring_great_bell', { wishText });
  }

  drawFortune() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('draw_fortune');
  }

  updateProfile(profile) {
    if (profile && typeof profile === 'object') {
      this.userProfile = { ...this.userProfile, ...profile };
    }
    if (!this.socket || !this.connected) return;
    this.socket.emit('update_profile', profile);
  }

  switchRoom(roomId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('switch_room', { roomId });
  }

  requestLeaderboard() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('get_leaderboard');
  }

  syncAccount(user) {
    if (user && typeof user === 'object') {
      this.userProfile = { ...this.userProfile, ...user };
    }
    if (!this.socket || !this.connected) return;
    this.socket.emit('auth_sync_account', { user });
  }
}
