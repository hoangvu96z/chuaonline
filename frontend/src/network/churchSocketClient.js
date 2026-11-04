// frontend/src/network/churchSocketClient.js
import { io } from 'socket.io-client';

const MOVE_THROTTLE_MS = 100; // Max 10 packets/second (100ms interval)

export class ChurchSocketClient {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.socket = null;
    this.connected = false;
    this.lastMoveSentAt = 0;
    this.pendingMoveTimer = null;
    this.latestMovePayload = null;
  }

  connect(userProfile = {}) {
    const backendUrl =
      import.meta.env?.VITE_BACKEND_URL ||
      (window.location.port === '5173' || window.location.port === '4173'
        ? `${window.location.protocol}//${window.location.hostname}:3001`
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
      this.socket.emit('join_church', {
        recoveryCode: userProfile.recoveryCode,
        christianName: userProfile.christianName,
        outfitColor: userProfile.outfitColor,
        avatarStyle: userProfile.avatarStyle,
        dioceseCode: userProfile.dioceseCode,
        ...userProfile
      });
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      if (this.handlers.onDisconnect) {
        this.handlers.onDisconnect();
      }
    });

    // Initial welcome state from ChurchRoomManager
    this.socket.on('church_joined', (data) => {
      if (this.handlers.onChurchJoined) this.handlers.onChurchJoined(data);
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

    // Grace & Spiritual Rank updates
    this.socket.on('grace_updated', (data) => {
      if (this.handlers.onGraceUpdated) this.handlers.onGraceUpdated(data);
    });

    this.socket.on('rosary_bead_clicked', (data) => {
      if (this.handlers.onRosaryBeadClicked) this.handlers.onRosaryBeadClicked(data);
    });

    this.socket.on('player_genuflected', (data) => {
      if (this.handlers.onPlayerGenuflected) this.handlers.onPlayerGenuflected(data);
    });

    // Marian Garden tasks spawn & tend events
    this.socket.on('garden_tasks_spawned', (data) => {
      if (this.handlers.onGardenTasksSpawned) this.handlers.onGardenTasksSpawned(data);
    });

    this.socket.on('garden_task_tended', (data) => {
      if (this.handlers.onGardenTaskTended) this.handlers.onGardenTaskTended(data);
    });

    // Global Server-Synced Liturgy (Giờ Kinh Phụng Vụ Cộng Đồng)
    this.socket.on('global_liturgy_start', (data) => {
      if (this.handlers.onGlobalLiturgyStart) this.handlers.onGlobalLiturgyStart(data);
    });

    this.socket.on('global_liturgy_status', (data) => {
      if (this.handlers.onGlobalLiturgyStatus) this.handlers.onGlobalLiturgyStatus(data);
    });

    // Top Grace Ticker (Băng Chữ Hiệp Thông toàn server)
    this.socket.on('grace_ticker', (data) => {
      if (this.handlers.onGraceTicker) this.handlers.onGraceTicker(data);
    });

    // Prayer Intentions (Votive Candle & White Rose)
    this.socket.on('new_intention', (intention) => {
      if (this.handlers.onNewIntention) this.handlers.onNewIntention(intention);
    });

    // Bell Tower Carillon rung
    this.socket.on('tower_bell_rung', (data) => {
      if (this.handlers.onTowerBellRung) this.handlers.onTowerBellRung(data);
    });

    // Scripture Word of God drawn result
    this.socket.on('scripture_drawn', (scripture) => {
      if (this.handlers.onScriptureDrawn) this.handlers.onScriptureDrawn(scripture);
    });

    // Diocese Leaderboard data
    this.socket.on('diocese_leaderboard_data', (data) => {
      if (this.handlers.onLeaderboardData) this.handlers.onLeaderboardData(data);
    });

    // Real-time Multi-User Parish Chat
    this.socket.on('church_chat_message', (msg) => {
      if (this.handlers.onChatMessage) this.handlers.onChatMessage(msg);
    });

    this.socket.on('chat_message', (msg) => {
      if (this.handlers.onChatMessage) this.handlers.onChatMessage(msg);
    });

    // Account Synced
    this.socket.on('account_synced', (data) => {
      if (this.handlers.onAccountSynced) this.handlers.onAccountSynced(data);
    });
  }

  /**
   * Tick-Rate Throttling (Max 10 packets/second = 100ms interval)
   */
  sendMove(x, z, rotY = 0, state = 'WALK', pewIndex = null) {
    if (!this.socket || !this.connected) return;
    this.latestMovePayload = { x, z, rotY, state, pewIndex };

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

  sendStateChange(state, pewIndex = null) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('change_church_state', { state, pewIndex });
    this.socket.emit('change_state', { state, pewIndex });
  }

  kneelPew(pewIndex, x, z) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('kneel_pew', { pewIndex, x, z });
  }

  clickRosaryBead() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('click_rosary_bead', { timestamp: Date.now() });
  }

  genuflectAltar(bowNumber = 1, target = 'ALTAR', rotY = Math.PI) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('genuflect_altar', { bowNumber, target, rotY, timestamp: Date.now() });
  }

  prayVerse(prayerId, verseIndex, graceEarned = 3) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('pray_verse', { prayerId, verseIndex, graceEarned });
  }

  completePrayer(prayerId, prayerTitle, completionBonus = 30) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('complete_prayer', { prayerId, prayerTitle, completionBonus });
  }

  tendGarden(taskId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('tend_garden', { taskId });
  }

  offerIntention(offeringType, intentionText, posX = 0, posZ = -10) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('offer_intention', { offeringType, intentionText, posX, posZ });
  }

  ringTowerBell(wishText = 'Nguyện xin bình an của Chúa Kitô ở cùng toàn thể giáo dân') {
    if (!this.socket || !this.connected) return;
    this.socket.emit('ring_tower_bell', { wishText });
  }

  drawScripture() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('draw_scripture');
  }

  updateProfile(profile) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('update_church_profile', profile);
  }

  switchRoom(roomId) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('switch_church_room', { roomId });
  }

  requestLeaderboard() {
    if (!this.socket || !this.connected) return;
    this.socket.emit('get_diocese_leaderboard');
  }

  sendChat(text, meta = {}) {
    if (!this.socket) return;
    this.socket.emit('send_church_chat', {
      text,
      christianName: meta.christianName,
      dioceseCode: meta.dioceseCode,
      roomId: meta.roomId,
      ...meta
    });
  }

  syncAccount(user) {
    if (!this.socket || !this.connected) return;
    this.socket.emit('auth_sync_church_account', { user });
  }
}
export default ChurchSocketClient;
