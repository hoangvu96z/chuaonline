// backend/src/churchSocketHandlers.js
import { sanitizeSensitiveChat } from './socketHandlers.js';

export function registerChurchSocketHandlers(
  io,
  { db, churchRoomManager, graceBatcher, liturgyScheduler }
) {
  const globalTickerTimestamps = new Map();

  function emitGlobalBothNamespaces(eventName, payload) {
    if (!io) return;
    if (typeof io.emit === 'function') {
      io.emit(eventName, payload);
    }
    if (typeof io.of === 'function') {
      try {
        io.of('/nhatho').emit(eventName, payload);
      } catch (_) {
        // Ignore if mock io
      }
    }
  }

  function emitToRoomBothNamespaces(roomId, eventName, payload) {
    if (!io) return;
    if (typeof io.to === 'function') {
      io.to(roomId).emit(eventName, payload);
    }
    if (typeof io.of === 'function') {
      try {
        io.of('/nhatho').to(roomId).emit(eventName, payload);
      } catch (_) {
        // Ignore if mock io
      }
    }
  }

  function emitThrottledGraceTicker(category, cooldownMs, payload) {
    const now = Date.now();
    const last = globalTickerTimestamps.get(category) || 0;
    if (now - last >= cooldownMs) {
      globalTickerTimestamps.set(category, now);
      emitGlobalBothNamespaces('grace_ticker', payload);
    }
  }

  function bindSocket(socket) {
    let currentChurchUser = null;
    const socketActionTimestamps = new Map();

    function checkActionCooldown(actionKey, minIntervalMs) {
      if (minIntervalMs <= 0) return true;
      const now = Date.now();
      const prev = socketActionTimestamps.get(actionKey) || 0;
      if (now - prev < minIntervalMs) return false;
      socketActionTimestamps.set(actionKey, now);
      return true;
    }

    // 1. Join Church & Assign Sharded Room (Max 60 players/room: thanh-duong-1, thanh-duong-2, ...)
    socket.on('join_church', async (payload = {}) => {
      try {
        currentChurchUser = await db.getOrCreateChurchUser({
          recoveryCode: payload.recoveryCode,
          christianName: payload.christianName,
          outfitColor: payload.outfitColor,
          avatarStyle: payload.avatarStyle,
          dioceseCode: payload.dioceseCode,
          gracePoints: payload.gracePoints,
          rosariesCompleted: payload.rosariesCompleted,
          gardenTended: payload.gardenTended,
          virtueTier: payload.virtueTier
        });

        const joinResult = churchRoomManager.joinRoom(
          socket,
          currentChurchUser,
          payload.preferredRoomId
        );
        const intentions = await db.getActiveIntentions(25);
        const globalLiturgy = liturgyScheduler.getCurrentSessionInfo();

        socket.emit('church_joined', {
          user: currentChurchUser,
          roomId: joinResult.roomId,
          player: joinResult.player,
          players: joinResult.players,
          gardenTasks: joinResult.gardenTasks,
          chatHistory: joinResult.chatHistory || [],
          intentions,
          globalLiturgy
        });
      } catch (err) {
        console.error('[Socket] join_church error:', err);
      }
    });

    // 2. Player Movement in Church Room (10Hz throttled from client, broadcast in 10Hz room tick)
    socket.on('move', (payload = {}) => {
      if (!currentChurchUser) return;
      churchRoomManager.updatePlayerMove(socket.id, payload);
    });

    // 3. Change Posture State (IDLE, WALK, KNEEL_PRAY, TEND_GARDEN, LIGHT_CANDLE, GENUFLECT)
    socket.on('change_state', (payload = {}) => {
      if (!currentChurchUser) return;
      churchRoomManager.updatePlayerState(socket.id, payload.state, payload.pewIndex ?? null);
    });

    // 4. Kneel at Wooden Pew in Sanctuary (Quỳ gối tại Hàng Ghế Gỗ Cung Thánh)
    socket.on('kneel_pew', (payload = {}) => {
      if (!currentChurchUser) return;
      const pIdx = Number(payload.pewIndex ?? 0);
      churchRoomManager.updatePlayerMove(socket.id, {
        x: payload.x ?? 0,
        z: payload.z ?? -7.2,
        rotY: Math.PI,
        state: 'KNEEL_PRAY',
        pewIndex: pIdx
      });
    });

    // 5. Click Rosary Bead (Lần Hạt Mân Côi: +1 Hoa Thiêng, or +2 if kneeling at pew during Global Liturgy)
    socket.on('click_rosary_bead', (payload = {}) => {
      if (!currentChurchUser) return;
      const pState = churchRoomManager.getPlayerState(socket.id);
      const isGlobal =
        liturgyScheduler.isGlobalLiturgyActive() &&
        pState &&
        pState.pewIndex !== null &&
        pState.pewIndex !== undefined;

      const delta = isGlobal ? 2 : 1;
      graceBatcher.addGrace(currentChurchUser, delta);
      churchRoomManager.syncUserStatsToPlayer(socket.id, currentChurchUser);

      socket.emit('grace_updated', {
        gracePoints: currentChurchUser.gracePoints,
        virtueTier: currentChurchUser.virtueTier,
        delta,
        reason: 'ROSARY_BEAD'
      });

      const room = churchRoomManager.getPlayerRoom(socket.id);
      if (room) {
        socket.to(room.id).emit('rosary_bead_clicked', {
          socketId: socket.id,
          userId: currentChurchUser.id,
          christianName: currentChurchUser.christianName,
          beadIndex: payload.beadIndex ?? 0
        });
      }
    });

    // 6. Pray Verse (+3 Hoa Thiêng per verse, or x2 = +6 during Global Liturgy on Pew)
    socket.on('pray_verse', (payload = {}) => {
      if (!currentChurchUser) return;
      const pState = churchRoomManager.getPlayerState(socket.id);
      const isGlobal =
        liturgyScheduler.isGlobalLiturgyActive() &&
        pState &&
        pState.pewIndex !== null &&
        pState.pewIndex !== undefined;

      const base = Math.min(10, Math.max(1, Number(payload.graceEarned || 3)));
      const delta = isGlobal ? base * 2 : base;

      graceBatcher.addGrace(currentChurchUser, delta);
      churchRoomManager.syncUserStatsToPlayer(socket.id, currentChurchUser);

      socket.emit('grace_updated', {
        gracePoints: currentChurchUser.gracePoints,
        virtueTier: currentChurchUser.virtueTier,
        delta,
        reason: 'PRAY_VERSE'
      });
    });

    // 7. Complete Full Prayer / Rosary (+completionBonus Hoa Thiêng + Global Grace Ticker announcement)
    socket.on('complete_prayer', (payload = {}) => {
      if (!currentChurchUser) return;
      const pState = churchRoomManager.getPlayerState(socket.id);
      const isGlobal =
        liturgyScheduler.isGlobalLiturgyActive() &&
        pState &&
        pState.pewIndex !== null &&
        pState.pewIndex !== undefined;

      const baseBonus = Math.min(100, Math.max(10, Number(payload.completionBonus || 30)));
      const delta = isGlobal ? baseBonus * 2 : baseBonus;
      const prayerTitle = String(
        payload.prayerTitle || 'Chuỗi Mân Côi - Năm Sự Vui'
      ).slice(0, 100);

      graceBatcher.addGrace(currentChurchUser, delta, { rosariesDelta: 1 });
      churchRoomManager.syncUserStatsToPlayer(socket.id, currentChurchUser);

      socket.emit('grace_updated', {
        gracePoints: currentChurchUser.gracePoints,
        virtueTier: currentChurchUser.virtueTier,
        rosariesCompleted: currentChurchUser.rosariesCompleted,
        delta,
        reason: 'COMPLETE_PRAYER'
      });

      emitGlobalBothNamespaces('grace_ticker', {
        type: 'PRAYER_COMPLETE',
        christianName: currentChurchUser.christianName,
        prayerTitle,
        graceEarned: delta,
        message: `📿 Tín hữu **${currentChurchUser.christianName}** vừa dâng xong **${prayerTitle}** (+${delta} Hoa Thiêng).`
      });
    });

    // 8. Tend Rose Garden in Marian Courtyard (+5 Hoa Thiêng)
    socket.on('tend_garden', (payload = {}) => {
      if (!currentChurchUser || !payload.taskId) return;
      const res = churchRoomManager.tendGardenTask(socket.id, payload.taskId);
      if (res) {
        socket.emit('grace_updated', {
          gracePoints: currentChurchUser.gracePoints,
          virtueTier: currentChurchUser.virtueTier,
          delta: 5,
          reason: 'TEND_GARDEN'
        });

        emitThrottledGraceTicker('TEND_GARDEN', 1500, {
          type: 'TEND_GARDEN',
          christianName: currentChurchUser.christianName,
          message: `🌹 Tín hữu **${currentChurchUser.christianName}** vừa chăm sóc Vườn Hoa Mân Côi (+5 Hoa Thiêng).`
        });
      }
    });

    // 9. Offer Prayer Intention: Light Votive Candle (CANDLE) or Offer Marian Rose (ROSE) (+10 Hoa Thiêng)
    socket.on('offer_intention', async (payload = {}) => {
      if (!currentChurchUser) return;
      const content = String(payload.content || '').trim();
      if (!content) return;

      const intentionType = payload.intentionType === 'ROSE' ? 'ROSE' : 'CANDLE';
      const savedIntention = await db.createIntention({
        userId: currentChurchUser.id,
        christianName: currentChurchUser.christianName,
        intentionType,
        content,
        posX: Number(payload.posX || 0),
        posZ: Number(payload.posZ || 24)
      });

      graceBatcher.addGrace(currentChurchUser, 10);
      churchRoomManager.syncUserStatsToPlayer(socket.id, currentChurchUser);

      socket.emit('grace_updated', {
        gracePoints: currentChurchUser.gracePoints,
        virtueTier: currentChurchUser.virtueTier,
        delta: 10,
        reason: intentionType
      });

      emitGlobalBothNamespaces('new_intention', savedIntention);
      const actionLabel =
        intentionType === 'ROSE'
          ? 'dâng Hoa Hồng trước Hang Đá Đức Mẹ Lộ Đức'
          : 'thắp Nến Cầu Nguyện tại Cung Thánh';
      const icon = intentionType === 'ROSE' ? '🌹' : '🕯️';
      emitGlobalBothNamespaces('grace_ticker', {
        type: 'INTENTION',
        christianName: currentChurchUser.christianName,
        intentionType,
        message: `${icon} Tín hữu **${currentChurchUser.christianName}** vừa ${actionLabel}: "${content.slice(0, 80)}"`
      });
    });

    // 10. Ring Bell Tower (Kéo Chuông Tháp báo giờ Kinh Truyền Tin: +2 Hoa Thiêng)
    socket.on('ring_tower_bell', () => {
      if (!currentChurchUser) return;
      graceBatcher.addGrace(currentChurchUser, 2);
      churchRoomManager.syncUserStatsToPlayer(socket.id, currentChurchUser);

      socket.emit('grace_updated', {
        gracePoints: currentChurchUser.gracePoints,
        virtueTier: currentChurchUser.virtueTier,
        delta: 2,
        reason: 'TOWER_BELL'
      });

      const room = churchRoomManager.getPlayerRoom(socket.id);
      if (room) {
        emitToRoomBothNamespaces(room.id, 'tower_bell_rung', {
          socketId: socket.id,
          christianName: currentChurchUser.christianName
        });
      }

      emitThrottledGraceTicker('TOWER_BELL', 4000, {
        type: 'TOWER_BELL',
        christianName: currentChurchUser.christianName,
        message: `🔔 Tín hữu **${currentChurchUser.christianName}** vừa ngân Chuông Tháp báo giờ Kinh Truyền Tin.`
      });
    });

    // 11. Genuflect / Sign of the Cross before Sanctuary Altar or Shrines (+5 Hoa Thiêng, or +10 in Global Liturgy)
    socket.on('genuflect_altar', (payload = {}) => {
      if (!currentChurchUser) return;
      const pState = churchRoomManager.getPlayerState(socket.id);
      const target = payload.target || 'ALTAR';
      const isShrine = target !== 'ALTAR';
      const isGlobal =
        !isShrine &&
        liturgyScheduler.isGlobalLiturgyActive() &&
        pState &&
        pState.pewIndex !== null &&
        pState.pewIndex !== undefined;

      const delta = isGlobal ? 10 : 5;
      graceBatcher.addGrace(currentChurchUser, delta);
      churchRoomManager.updatePlayerState(
        socket.id,
        'GENUFLECT',
        isShrine ? null : (pState?.pewIndex ?? 0)
      );
      churchRoomManager.syncUserStatsToPlayer(socket.id, currentChurchUser);

      socket.emit('grace_updated', {
        gracePoints: currentChurchUser.gracePoints,
        virtueTier: currentChurchUser.virtueTier,
        delta,
        reason: 'GENUFLECT_ALTAR'
      });

      const room = churchRoomManager.getPlayerRoom(socket.id);
      if (room) {
        socket.to(room.id).emit('player_genuflected', {
          socketId: socket.id,
          userId: currentChurchUser.id,
          christianName: currentChurchUser.christianName,
          bowNumber: payload.bowNumber || 1,
          target,
          rotY: typeof payload.rotY === 'number' ? payload.rotY : Math.PI
        });
      }

      if (target === 'DUC_ME') {
        emitThrottledGraceTicker('GENUFLECT_DUC_ME', 1500, {
          type: 'GENUFLECT_DUC_ME',
          christianName: currentChurchUser.christianName,
          message: `🌹 Tín hữu **${currentChurchUser.christianName}** vừa quỳ gối cầu nguyện trước Hang Đá Đức Mẹ Lộ Đức (+${delta} Hoa Thiêng).`
        });
      } else if (target === 'THANH_GIUSE') {
        emitThrottledGraceTicker('GENUFLECT_THANH_GIUSE', 1500, {
          type: 'GENUFLECT_THANH_GIUSE',
          christianName: currentChurchUser.christianName,
          message: `⚜️ Tín hữu **${currentChurchUser.christianName}** vừa kính viếng Đài Thánh Cả Giuse cầu cho gia đạo bình an (+${delta} Hoa Thiêng).`
        });
      } else if (target === 'THANH_TAM') {
        emitThrottledGraceTicker('GENUFLECT_THANH_TAM', 1500, {
          type: 'GENUFLECT_THANH_TAM',
          christianName: currentChurchUser.christianName,
          message: `❤️‍🔥 Tín hữu **${currentChurchUser.christianName}** vừa tôn kính Tượng Thánh Tâm Chúa Giêsu (+${delta} Hoa Thiêng).`
        });
      } else {
        emitThrottledGraceTicker('GENUFLECT_ALTAR', 1000, {
          type: 'GENUFLECT_ALTAR',
          christianName: currentChurchUser.christianName,
          message: `✝️ Tín hữu **${currentChurchUser.christianName}** vừa Bái Gối & Làm Dấu Thánh Giá thờ lạy Thánh Thể trước Cung Thánh (+${delta} Hoa Thiêng).`
        });
      }
    });

    // 12. Draw Daily Catholic Scripture (Rút Lộc Thánh Lời Chúa)
    socket.on('draw_scripture', async () => {
      try {
        const scripture = await db.getRandomScripture();
        socket.emit('scripture_drawn', scripture);
      } catch (err) {
        console.error('[Socket] draw_scripture error:', err);
      }
    });

    // 13. Update Church Profile (Tên Thánh & Họ Tên, Giáo Phận, Màu Lễ Phục, Kiểu Nhân Vật)
    socket.on('update_church_profile', async (payload = {}) => {
      if (!currentChurchUser) return;
      if (payload.christianName)
        currentChurchUser.christianName = String(payload.christianName).slice(0, 50);
      if (payload.outfitColor)
        currentChurchUser.outfitColor = String(payload.outfitColor).slice(0, 16);
      if (payload.avatarStyle)
        currentChurchUser.avatarStyle = String(payload.avatarStyle).slice(0, 32);
      if (payload.dioceseCode)
        currentChurchUser.dioceseCode = String(payload.dioceseCode).slice(0, 10);

      await db.updateChurchUserProfile(currentChurchUser.id, {
        christianName: currentChurchUser.christianName,
        outfitColor: currentChurchUser.outfitColor,
        avatarStyle: currentChurchUser.avatarStyle,
        dioceseCode: currentChurchUser.dioceseCode
      });
      churchRoomManager.syncUserStatsToPlayer(socket.id, currentChurchUser);
    });

    // 14. Switch Church Room Channel
    socket.on('switch_church_room', (payload = {}) => {
      if (!currentChurchUser || !payload.roomId) return;
      const joinResult = churchRoomManager.joinRoom(socket, currentChurchUser, payload.roomId);
      socket.emit('church_joined', {
        user: currentChurchUser,
        roomId: joinResult.roomId,
        player: joinResult.player,
        players: joinResult.players,
        gardenTasks: joinResult.gardenTasks,
        chatHistory: joinResult.chatHistory || []
      });
    });

    // 15. Request Diocese Leaderboard (Bảng Hiệp Thông 27 Giáo Phận)
    socket.on('get_diocese_leaderboard', async () => {
      const lb = await db.getChurchLeaderboards();
      socket.emit('diocese_leaderboard_data', lb);
    });

    // 16. Sync Church Account after Login / Register
    socket.on('auth_sync_church_account', async (payload = {}) => {
      if (!payload || !payload.user) return;
      try {
        const incoming = payload.user;
        if (incoming.recoveryCode) {
          const canonical = await db.getOrCreateChurchUser({
            recoveryCode: incoming.recoveryCode,
            christianName: incoming.christianName || currentChurchUser?.christianName,
            outfitColor: incoming.outfitColor || currentChurchUser?.outfitColor,
            avatarStyle: incoming.avatarStyle || currentChurchUser?.avatarStyle,
            dioceseCode: incoming.dioceseCode || currentChurchUser?.dioceseCode,
            gracePoints: incoming.gracePoints,
            rosariesCompleted: incoming.rosariesCompleted,
            gardenTended: incoming.gardenTended,
            virtueTier: incoming.virtueTier
          });
          currentChurchUser = {
            ...currentChurchUser,
            ...canonical,
            ...incoming,
            id: canonical.id,
            gracePoints: Math.max(
              Number(canonical.gracePoints || 0),
              Number(incoming.gracePoints || 0)
            ),
            virtueTier: Math.max(Number(canonical.virtueTier || 1), Number(incoming.virtueTier || 1))
          };
        } else {
          currentChurchUser = {
            ...currentChurchUser,
            ...incoming
          };
        }
        churchRoomManager.syncUserStatsToPlayer(socket.id, currentChurchUser);
        socket.emit('church_account_synced', { user: currentChurchUser });
      } catch (err) {
        console.warn('[Socket] auth_sync_church_account warning:', err.message);
      }
    });

    // 17. Real-Time Multi-User Catholic Chat with Sensitive Word Filtering
    socket.on('send_church_chat', (payload = {}) => {
      if (!checkActionCooldown('send_church_chat', 150)) return;
      const rawText = String(payload.text || '').trim();
      if (!rawText) return;

      if (!currentChurchUser) {
        currentChurchUser = {
          id: 'guest-' + socket.id.slice(0, 6),
          christianName: String(payload.christianName || 'Tín Hữu').slice(0, 50),
          dioceseCode: String(payload.dioceseCode || 'SG').slice(0, 10),
          outfitColor: '#f5f0e6',
          avatarStyle: 'GIAO_DAN_AO_DAI',
          gracePoints: 0,
          virtueTier: 1
        };
      }
      let room = churchRoomManager.getPlayerRoom(socket.id);
      if (!room) {
        churchRoomManager.joinRoom(socket, currentChurchUser, payload.roomId || 'thanh-duong-1');
        room = churchRoomManager.getPlayerRoom(socket.id);
      }

      const { cleaned, flagged } = sanitizeSensitiveChat(rawText);
      const chatPayload = {
        id: 'chat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        socketId: socket.id,
        userId: currentChurchUser.id,
        christianName: String(
          payload.christianName || currentChurchUser.christianName || 'Tín Hữu'
        ).slice(0, 50),
        dioceseCode: String(payload.dioceseCode || currentChurchUser.dioceseCode || 'SG').slice(
          0,
          10
        ),
        roomId: room ? room.id : 'thanh-duong-1',
        text: cleaned,
        flagged,
        timestamp: Date.now()
      };

      churchRoomManager.recordRoomChat(socket.id, chatPayload);
      const targetRoomId = room ? room.id : 'thanh-duong-1';
      emitToRoomBothNamespaces(targetRoomId, 'church_chat_message', chatPayload);
    });

    socket.on('disconnect', () => {
      if (currentChurchUser || churchRoomManager.socketToRoom.has(socket.id)) {
        churchRoomManager.leaveRoom(socket);
      }
    });
  }

  // Register on default '/' namespace so clients connecting to root '/' can emit join_church seamlessly
  io.on('connection', (socket) => {
    bindSocket(socket);
  });

  // Also register on dedicated '/nhatho' namespace
  if (typeof io.of === 'function') {
    const churchNsp = io.of('/nhatho');
    churchNsp.on('connection', (socket) => {
      bindSocket(socket);
    });
  }
}
