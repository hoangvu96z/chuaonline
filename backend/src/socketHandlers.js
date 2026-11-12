// backend/src/socketHandlers.js

// Bộ lọc từ ngữ nhạy cảm / tục tĩu (Tiếng Việt có dấu, không dấu, viết tắt & Tiếng Anh — dùng Unicode boundary cho tiếng Việt)
const SENSITIVE_PATTERNS = [
  /(^|[^\p{L}\p{N}])(đụ|địt|đéo|đĩ|đếch|lồn|buồi|cặc|dái|vãi\s*lồn|vãi\s*cặc|vcl|vl|vkl|đm|đkm|đcm|đmm|dkm|dcm|dmm|vcc|cc|clm|cl|sml)(?=[^\p{L}\p{N}]|$)/giu,
  /(^|[^\p{L}\p{N}])(du\s*ma|dit\s*me|dit\s*con\s*me|deo\s*me|lon\s*me|con\s*di|thang\s*cho|do\s*ngu|oc\s*cho|óc\s*chó|ngu\s*ngốc|súc\s*vật|suc\s*vat|chó\s*đẻ|cho\s*de|mất\s*dạy|mat\s*day|khốn\s*nạn|khon\s*nan)(?=[^\p{L}\p{N}]|$)/giu,
  /(^|[^\p{L}\p{N}])(fuck|fucking|fucker|shit|bitch|asshole|dick|pussy|bastard|cunt|whore|slut|porn|sex|xxx)(?=[^\p{L}\p{N}]|$)/giu,
  /(^|[^\p{L}\p{N}])(cờ\s*bạc|cá\s*độ|nhà\s*cái|lô\s*đề|tài\s*xỉu|nổ\s*hũ|bắn\s*cá\s*đổi\s*thưởng|phản\s*động)(?=[^\p{L}\p{N}]|$)/giu
];

export function sanitizeSensitiveChat(rawText = '') {
  let cleaned = String(rawText || '').trim().slice(0, 160);
  let flagged = false;
  for (const regex of SENSITIVE_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(cleaned)) {
      flagged = true;
      regex.lastIndex = 0;
      cleaned = cleaned.replace(regex, '$1***');
    }
  }
  return { cleaned, flagged };
}

export function registerSocketHandlers(io, { db, roomManager, meritBatcher, sutraScheduler }) {
  const globalTickerTimestamps = new Map();

  function emitThrottledGlobalTicker(category, cooldownMs, payload) {
    const now = Date.now();
    const last = globalTickerTimestamps.get(category) || 0;
    if (now - last >= cooldownMs) {
      globalTickerTimestamps.set(category, now);
      io.emit('zen_ticker', payload);
    }
  }

  io.on('connection', (socket) => {
    let currentUser = null;
    const socketActionTimestamps = new Map();

    function checkActionCooldown(actionKey, minIntervalMs) {
      if (minIntervalMs <= 0) return true;
      const now = Date.now();
      const prev = socketActionTimestamps.get(actionKey) || 0;
      if (now - prev < minIntervalMs) return false;
      socketActionTimestamps.set(actionKey, now);
      return true;
    }

    // 1. Join Temple & Assign Sharded Room (Max 60 players/room)
    socket.on('join_temple', async (payload = {}) => {
      try {
        currentUser = await db.getOrCreateUser({
          recoveryCode: payload.recoveryCode,
          dharmaName: payload.dharmaName,
          robeColor: payload.robeColor,
          provinceCode: payload.provinceCode,
          avatarStyle: payload.avatarStyle,
          companionType: payload.companionType,
          lotusFootsteps: payload.lotusFootsteps,
          headwearType: payload.headwearType,
          meritPoints: payload.meritPoints,
          sutrasCompleted: payload.sutrasCompleted,
          leavesSwept: payload.leavesSwept,
          realmLevel: payload.realmLevel
        });
        if (payload.avatarStyle) {
          currentUser.avatarStyle = String(payload.avatarStyle).slice(0, 32);
        }
        if (payload.companionType !== undefined) {
          currentUser.companionType = String(payload.companionType || 'MEO_CHUA').slice(0, 24);
        }
        if (payload.lotusFootsteps !== undefined) {
          currentUser.lotusFootsteps = Boolean(payload.lotusFootsteps);
        }
        if (payload.headwearType !== undefined) {
          currentUser.headwearType = String(payload.headwearType || 'AUTO').slice(0, 24);
        }

        const joinResult = roomManager.joinRoom(socket, currentUser, payload.preferredRoomId);
        const wishes = await db.getActiveWishes(25);
        const globalSutra = sutraScheduler.getCurrentSessionInfo();

        socket.emit('temple_joined', {
          user: currentUser,
          roomId: joinResult.roomId,
          player: joinResult.player,
          players: joinResult.players,
          leaves: joinResult.leaves,
          plantedTrees: joinResult.plantedTrees || [],
          chatHistory: joinResult.chatHistory || [],
          coopGoal: joinResult.coopGoal,
          wishes,
          globalSutra
        });
      } catch (err) {
        console.error('[Socket] join_temple error:', err);
      }
    });

    // 2. Player Movement (10Hz throttled from client, broadcast in 10Hz room tick)
    socket.on('move', (payload = {}) => {
      if (!currentUser) return;
      roomManager.updatePlayerMove(socket.id, payload);
    });

    // 3. Change Posture State (IDLE, WALK, SIT, CHANT, SWEEP)
    socket.on('change_state', (payload = {}) => {
      if (!currentUser) return;
      roomManager.updatePlayerState(socket.id, payload.state, payload.cushionIndex ?? null);
    });

    // 4. Sit on Meditation Cushion in Chánh Điện
    socket.on('sit_cushion', (payload = {}) => {
      if (!currentUser) return;
      const cIdx = Number(payload.cushionIndex ?? 0);
      roomManager.updatePlayerMove(socket.id, {
        x: payload.x ?? 0,
        z: payload.z ?? -7.2,
        rotY: Math.PI,
        state: 'SIT',
        cushionIndex: cIdx
      });
    });

    // 5. Knock Wooden Fish (Gõ Mõ: +1 Công Đức, or +2 if sitting on cushion during Global Session)
    socket.on('knock_wooden_fish', () => {
      if (!currentUser) return;
      const pState = roomManager.getPlayerState(socket.id);
      const isGlobal =
        sutraScheduler.isGlobalSessionActive() &&
        pState &&
        pState.cushionIndex !== null &&
        pState.cushionIndex !== undefined;

      const delta = isGlobal ? 2 : 1;
      meritBatcher.addMerit(currentUser, delta);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);
      roomManager.addCoopProgress(socket.id, 1, currentUser.dharmaName);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta,
        reason: 'WOODEN_FISH'
      });

      const room = roomManager.getPlayerRoom(socket.id);
      if (room) {
        socket.to(room.id).emit('wooden_fish_knocked', {
          socketId: socket.id,
          userId: currentUser.id,
          dharmaName: currentUser.dharmaName
        });
      }
    });

    // 5b. Prostrate to Buddha (Lạy Phật Đảnh Lễ Tam Bảo: +5 Công Đức, or +10 in Global Session)
    socket.on('prostrate_buddha', (payload = {}) => {
      if (!currentUser) return;
      const pState = roomManager.getPlayerState(socket.id);
      const isShrine = payload.target && payload.target !== 'BUDDHA';
      const isGlobal =
        !isShrine &&
        sutraScheduler.isGlobalSessionActive() &&
        pState &&
        pState.cushionIndex !== null &&
        pState.cushionIndex !== undefined;

      const delta = isGlobal ? 10 : 5;
      meritBatcher.addMerit(currentUser, delta);
      roomManager.updatePlayerState(socket.id, 'PROSTRATE', isShrine ? null : (pState?.cushionIndex ?? 2));
      if (payload.bowProgressText !== undefined) {
        roomManager.updatePlayerBowProgress(socket.id, payload.bowProgressText);
      }
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);
      roomManager.addCoopProgress(socket.id, 2, currentUser.dharmaName);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta,
        reason: 'PROSTRATE_BUDDHA'
      });

      const room = roomManager.getPlayerRoom(socket.id);
      if (room) {
        socket.to(room.id).emit('player_prostrated', {
          socketId: socket.id,
          userId: currentUser.id,
          dharmaName: currentUser.dharmaName,
          bowNumber: payload.bowNumber || 1,
          target: payload.target || 'BUDDHA',
          rotY: typeof payload.rotY === 'number' ? payload.rotY : Math.PI
        });
      }

      const target = payload.target || 'BUDDHA';
      if (target === 'QUAN_AM') {
        emitThrottledGlobalTicker('PROSTRATION_QUAN_AM', 1500, {
          type: 'PROSTRATION_QUAN_AM',
          dharmaName: currentUser.dharmaName,
          message: `🙏 Đạo hữu "${currentUser.dharmaName}" vừa thành tâm quỳ lạy trước Đài Quán Thế Âm Bồ Tát cầu gia đạo bình an (+${delta} Công Đức).`
        });
      } else if (target === 'DI_LAC') {
        emitThrottledGlobalTicker('PROSTRATION_DI_LAC', 1500, {
          type: 'PROSTRATION_DI_LAC',
          dharmaName: currentUser.dharmaName,
          message: `😄 Đạo hữu "${currentUser.dharmaName}" vừa thành tâm đảnh lễ Đức Phật Di Lặc cầu hoan hỷ phúc lộc (+${delta} Công Đức).`
        });
      } else if (target === 'DIA_TANG') {
        emitThrottledGlobalTicker('PROSTRATION_DIA_TANG', 1500, {
          type: 'PROSTRATION_DIA_TANG',
          dharmaName: currentUser.dharmaName,
          message: `🙏 Đạo hữu "${currentUser.dharmaName}" vừa thành tâm đảnh lễ Đức Địa Tạng Vương Bồ Tát (+${delta} Công Đức).`
        });
      } else if (target === 'DUOC_SU') {
        emitThrottledGlobalTicker('PROSTRATION_DUOC_SU', 1500, {
          type: 'PROSTRATION_DUOC_SU',
          dharmaName: currentUser.dharmaName,
          message: `🔵 Đạo hữu "${currentUser.dharmaName}" vừa thành tâm đảnh lễ Đức Phật Dược Sư Lưu Ly Quang cầu tiêu tai diên thọ (+${delta} Công Đức).`
        });
      } else if (target === 'BAO_THAP') {
        emitThrottledGlobalTicker('PROSTRATION_BAO_THAP', 1500, {
          type: 'PROSTRATION_BAO_THAP',
          dharmaName: currentUser.dharmaName,
          message: `☸️ Đạo hữu "${currentUser.dharmaName}" vừa chiêm bái & đảnh lễ Bảo Tháp Phật Tích (+${delta} Công Đức).`
        });
      } else if (target === 'ONG_TO_BA_NGUYET') {
        emitThrottledGlobalTicker('PROSTRATION_ONG_TO_BA_NGUYET', 1500, {
          type: 'PROSTRATION_ONG_TO_BA_NGUYET',
          dharmaName: currentUser.dharmaName,
          message: `🧧 Đạo hữu "${currentUser.dharmaName}" vừa thành tâm kính lễ Ông Tơ Bà Nguyệt cầu nhân duyên viên mãn (+${delta} Công Đức).`
        });
      } else if (target === 'THAN_TAI') {
        emitThrottledGlobalTicker('PROSTRATION_THAN_TAI', 1500, {
          type: 'PROSTRATION_THAN_TAI',
          dharmaName: currentUser.dharmaName,
          message: `💰 Đạo hữu "${currentUser.dharmaName}" vừa thành tâm kính lễ Thần Tài Phú Quý cầu tài lộc hanh thông (+${delta} Công Đức).`
        });
      } else if (payload.bowNumber === 3) {
        emitThrottledGlobalTicker('PROSTRATION_BUDDHA', 800, {
          type: 'PROSTRATION',
          dharmaName: currentUser.dharmaName,
          message: `🙏 Đạo hữu "${currentUser.dharmaName}" vừa thành tâm Tam Bái Đảnh Lễ Tam Bảo trước Chánh Điện (+${delta * 3} Công Đức).`
        });
      }
    });

    // 6. Chant Sutra Verse (+3 Công Đức per verse, or x2 = +6 during Global Session on Cushion)
    socket.on('chant_verse', (payload = {}) => {
      if (!currentUser) return;
      const pState = roomManager.getPlayerState(socket.id);
      const isGlobal =
        sutraScheduler.isGlobalSessionActive() &&
        pState &&
        pState.cushionIndex !== null &&
        pState.cushionIndex !== undefined;

      const base = Math.min(10, Math.max(1, Number(payload.meritEarned || 3)));
      const delta = isGlobal ? base * 2 : base;

      meritBatcher.addMerit(currentUser, delta);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta,
        reason: 'CHANT_VERSE'
      });
    });

    // 7. Complete Full Sutra (+completionBonus Công Đức + Global Zen Ticker announcement)
    socket.on('complete_sutra', (payload = {}) => {
      if (!currentUser) return;
      const pState = roomManager.getPlayerState(socket.id);
      const isGlobal =
        sutraScheduler.isGlobalSessionActive() &&
        pState &&
        pState.cushionIndex !== null &&
        pState.cushionIndex !== undefined;

      const baseBonus = Math.min(100, Math.max(10, Number(payload.completionBonus || 30)));
      const delta = isGlobal ? baseBonus * 2 : baseBonus;
      const sutraTitle = String(payload.sutraTitle || 'Bát Nhã Tâm Kinh').slice(0, 100);

      meritBatcher.addMerit(currentUser, delta, { sutrasDelta: 1 });
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);
      roomManager.addCoopProgress(socket.id, 10, currentUser.dharmaName);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        sutrasCompleted: currentUser.sutrasCompleted,
        delta,
        reason: 'COMPLETE_SUTRA'
      });

      io.emit('zen_ticker', {
        type: 'SUTRA_COMPLETE',
        dharmaName: currentUser.dharmaName,
        sutraTitle,
        meritEarned: delta,
        message: `📖 Đạo hữu "${currentUser.dharmaName}" vừa thành tâm trì tụng viên mãn "${sutraTitle}" (+${delta} Công Đức).`
      });
    });

    // 8. Sweep Fallen Banyan Leaf (+5 Công Đức)
    socket.on('sweep_leaf', (payload = {}) => {
      if (!currentUser || !payload.leafId) return;
      const res = roomManager.sweepLeaf(socket.id, payload.leafId);
      if (res) {
        roomManager.addCoopProgress(socket.id, 3, currentUser.dharmaName);
        socket.emit('merit_updated', {
          meritPoints: currentUser.meritPoints,
          realmLevel: currentUser.realmLevel,
          delta: 5,
          reason: 'SWEEP_LEAF'
        });
      }
    });

    // 9. Make Wish: Offer Incense, Release Lotus Lantern, Release Sky Lantern, or Pray Cau Duyen (+10 Công Đức)
    socket.on('make_wish', async (payload = {}) => {
      if (!currentUser) return;
      const content = String(payload.content || '').trim();
      if (!content) return;

      const allowedTypes = new Set(['INCENSE', 'LANTERN', 'SKY_LANTERN', 'CAU_DUYEN']);
      const wishType = allowedTypes.has(payload.wishType) ? payload.wishType : 'INCENSE';
      const savedWish = await db.createWish({
        userId: currentUser.id,
        dharmaName: currentUser.dharmaName,
        wishType,
        content,
        posX: Number(payload.posX || 0),
        posZ: Number(payload.posZ || 34)
      });

      meritBatcher.addMerit(currentUser, 10);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);
      roomManager.addCoopProgress(socket.id, 5, currentUser.dharmaName);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta: 10,
        reason: wishType
      });

      io.emit('new_wish', savedWish);
      let actionLabel = 'dâng nén Tâm Hương cầu nguyện';
      let icon = '🪷';
      if (wishType === 'LANTERN') {
        actionLabel = 'thả đèn Hoa Đăng cầu nguyện';
        icon = '🪷';
      } else if (wishType === 'SKY_LANTERN') {
        actionLabel = 'thả Đèn Trời gửi lời ước nguyện';
        icon = '🏮';
      } else if (wishType === 'CAU_DUYEN') {
        actionLabel = 'dâng lời ước nguyện Cầu Duyên lên Ông Tơ Bà Nguyệt';
        icon = '🧧';
      }
      io.emit('zen_ticker', {
        type: 'WISH',
        dharmaName: currentUser.dharmaName,
        wishType,
        message: `${icon} Đạo hữu "${currentUser.dharmaName}" vừa ${actionLabel}: "${content.slice(0, 90)}"`
      });
    });

    // 10. Ring Great Bell (Thỉnh Đại Hồng Chung)
    socket.on('ring_great_bell', (payload = {}) => {
      if (!currentUser) return;
      const now = Date.now();
      meritBatcher.addMerit(currentUser, 2);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);
      roomManager.addCoopProgress(socket.id, 3, currentUser.dharmaName);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta: 2,
        reason: 'GREAT_BELL'
      });

      const room = roomManager.getPlayerRoom(socket.id);
      if (room) {
        io.to(room.id).emit('great_bell_rung', {
          socketId: socket.id,
          dharmaName: currentUser.dharmaName
        });
      }

      emitThrottledGlobalTicker('GREAT_BELL', 4000, {
        type: 'GREAT_BELL',
        dharmaName: currentUser.dharmaName,
        message: `🔔 Đạo hữu "${currentUser.dharmaName}" vừa thỉnh Đại Hồng Chung cầu quốc thái dân an.`
      });
    });

    // 11. Draw Daily Buddhist Fortune (Xin Xăm)
    socket.on('draw_fortune', async () => {
      try {
        const fortune = await db.getRandomFortune();
        socket.emit('fortune_drawn', fortune);
      } catch (err) {
        console.error('[Socket] draw_fortune error:', err);
      }
    });

    // 12. Update Profile (Pháp Danh, Tỉnh Thành, Màu Áo Lam, Kiểu Nhân Vật, Linh Thú, Bộ Bộ Sinh Liên)
    socket.on('update_profile', async (payload = {}) => {
      if (!currentUser) return;
      if (payload.dharmaName) currentUser.dharmaName = String(payload.dharmaName).slice(0, 50);
      if (payload.robeColor) currentUser.robeColor = String(payload.robeColor).slice(0, 16);
      if (payload.avatarStyle) currentUser.avatarStyle = String(payload.avatarStyle).slice(0, 32);
      if (payload.companionType !== undefined) {
        currentUser.companionType = String(payload.companionType || 'NONE').slice(0, 24);
      }
      if (payload.lotusFootsteps !== undefined) {
        currentUser.lotusFootsteps = Boolean(payload.lotusFootsteps);
      }
      if (payload.headwearType !== undefined) {
        currentUser.headwearType = String(payload.headwearType || 'AUTO').slice(0, 24);
      }
      if (payload.provinceCode) currentUser.provinceCode = String(payload.provinceCode).slice(0, 10);

      await db.updateUserProfile(currentUser.id, {
        dharmaName: currentUser.dharmaName,
        robeColor: currentUser.robeColor,
        provinceCode: currentUser.provinceCode,
        avatarStyle: currentUser.avatarStyle,
        companionType: currentUser.companionType,
        lotusFootsteps: currentUser.lotusFootsteps,
        headwearType: currentUser.headwearType,
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel
      });
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);
    });

    // 13. Switch Room Channel
    socket.on('switch_room', (payload = {}) => {
      if (!currentUser || !payload.roomId) return;
      const joinResult = roomManager.joinRoom(socket, currentUser, payload.roomId);
      socket.emit('temple_joined', {
        user: currentUser,
        roomId: joinResult.roomId,
        player: joinResult.player,
        players: joinResult.players,
        leaves: joinResult.leaves,
        plantedTrees: joinResult.plantedTrees || [],
        chatHistory: joinResult.chatHistory || []
      });
    });

    // 14. Request Leaderboard
    socket.on('get_leaderboard', async () => {
      const lb = await db.getLeaderboards();
      socket.emit('leaderboard_data', lb);
    });

    // 15. Sync Account after Login / Register
    socket.on('auth_sync_account', async (payload = {}) => {
      if (!payload || !payload.user) return;
      try {
        const incoming = payload.user;
        if (incoming.recoveryCode) {
          const canonical = await db.getOrCreateUser({
            recoveryCode: incoming.recoveryCode,
            dharmaName: incoming.dharmaName || currentUser?.dharmaName,
            robeColor: incoming.robeColor || currentUser?.robeColor,
            provinceCode: incoming.provinceCode || currentUser?.provinceCode,
            avatarStyle: incoming.avatarStyle || currentUser?.avatarStyle,
            companionType: incoming.companionType || currentUser?.companionType,
            lotusFootsteps:
              incoming.lotusFootsteps !== undefined
                ? incoming.lotusFootsteps
                : currentUser?.lotusFootsteps,
            headwearType: incoming.headwearType || currentUser?.headwearType,
            meritPoints: incoming.meritPoints,
            sutrasCompleted: incoming.sutrasCompleted,
            leavesSwept: incoming.leavesSwept,
            realmLevel: incoming.realmLevel
          });
          currentUser = {
            ...currentUser,
            ...canonical,
            ...incoming,
            id: canonical.id,
            meritPoints: Math.max(Number(canonical.meritPoints || 0), Number(incoming.meritPoints || 0)),
            realmLevel: Math.max(Number(canonical.realmLevel || 1), Number(incoming.realmLevel || 1))
          };
        } else {
          currentUser = {
            ...currentUser,
            ...incoming
          };
        }
        roomManager.syncUserStatsToPlayer(socket.id, currentUser);
        socket.emit('account_synced', { user: currentUser });
      } catch (err) {
        console.warn('[Socket] auth_sync_account warning:', err.message);
      }
    });

    // 16. Real-Time Multi-User Chat with Sensitive Word Filtering & 3D Speech Bubbles
    socket.on('send_chat', (payload = {}) => {
      if (!checkActionCooldown('send_chat', 150)) return;
      const rawText = String(payload.text || '').trim();
      if (!rawText) return;

      // Ensure user & room are initialized even if send_chat arrives while join_temple is still awaiting DB
      if (!currentUser) {
        currentUser = {
          id: 'guest-' + socket.id.slice(0, 6),
          dharmaName: String(payload.dharmaName || 'Đạo Hữu').slice(0, 50),
          provinceCode: String(payload.provinceCode || 'SG').slice(0, 10),
          robeColor: '#d4a359',
          avatarStyle: 'DEVOTEE_CLASSIC',
          meritPoints: 0,
          realmLevel: 1
        };
      }
      let room = roomManager.getPlayerRoom(socket.id);
      if (!room) {
        roomManager.joinRoom(socket, currentUser, payload.roomId || 'chanh-dien-1');
        room = roomManager.getPlayerRoom(socket.id);
      }

      const { cleaned, flagged } = sanitizeSensitiveChat(rawText);
      const chatPayload = {
        id: 'chat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        socketId: socket.id,
        userId: currentUser.id,
        dharmaName: String(payload.dharmaName || currentUser.dharmaName || 'Đạo Hữu').slice(0, 50),
        provinceCode: String(payload.provinceCode || currentUser.provinceCode || 'SG').slice(0, 10),
        roomId: room ? room.id : 'chanh-dien-1',
        text: cleaned,
        flagged,
        timestamp: Date.now()
      };

      roomManager.recordRoomChat(socket.id, chatPayload);
      db.saveChatMessage(chatPayload).catch((err) => {
        console.warn('[Socket] saveChatMessage error:', err.message);
      });
      if (room) {
        io.to(room.id).emit('chat_message', chatPayload);
      } else {
        io.to('chanh-dien-1').emit('chat_message', chatPayload);
      }
    });

    // 17. Plant & Water Sacred Bodhi Tree in Vườn Bồ Đề (+8 Công Đức)
    socket.on('plant_bodhi_tree', (payload = {}) => {
      if (!currentUser) return;
      const delta = 8;
      meritBatcher.addMerit(currentUser, delta);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta,
        reason: 'PLANT_BODHI_TREE'
      });

      const treeData = {
        socketId: socket.id,
        dharmaName: currentUser.dharmaName,
        provinceCode: currentUser.provinceCode || 'SG',
        wish: String(payload.wish || 'Ươm mầm Bồ Đề, gieo duyên giác ngộ').slice(0, 80)
      };

      roomManager.recordPlantedTree(socket.id, treeData);
      const room = roomManager.getPlayerRoom(socket.id);
      if (room) {
        io.to(room.id).emit('bodhi_tree_planted', treeData);
      } else {
        socket.emit('bodhi_tree_planted', treeData);
      }

      emitThrottledGlobalTicker('BODHI_TREE', 1500, {
        type: 'BODHI_TREE',
        dharmaName: currentUser.dharmaName,
        message: `🌱 Đạo hữu "${currentUser.dharmaName}" vừa trồng & tưới nước Cây Bồ Đề tại Vườn Lâm Tỳ Ni (+${delta} Công Đức).`
      });
    });

    // 18. Feed Sacred Koi Fish in Lotus Pond (+6 Công Đức)
    socket.on('feed_koi_fish', () => {
      if (!currentUser) return;
      const delta = 6;
      meritBatcher.addMerit(currentUser, delta);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta,
        reason: 'FEED_KOI_FISH'
      });

      const room = roomManager.getPlayerRoom(socket.id);
      if (room) {
        io.to(room.id).emit('koi_fish_fed', {
          socketId: socket.id,
          dharmaName: currentUser.dharmaName
        });
      } else {
        socket.emit('koi_fish_fed', {
          socketId: socket.id,
          dharmaName: currentUser.dharmaName
        });
      }

      emitThrottledGlobalTicker('KOI_FISH', 1500, {
        type: 'KOI_FISH',
        dharmaName: currentUser.dharmaName,
        message: `🐟 Đạo hữu "${currentUser.dharmaName}" vừa rải thức ăn nuôi đàn Cá Chép Koi tại Hồ Phóng Sinh (+${delta} Công Đức).`
      });
    });

    // 19. Lần Tràng Hạt 108 Hạt (Prayer Beads: +1 Công Đức mỗi hạt, +25 Công Đức khi hoàn thành đủ 108 hạt)
    socket.on('pray_beads_step', (payload = {}) => {
      if (!currentUser) return;
      const completedRound = Boolean(payload.completedRound) || Number(payload.beadIndex) === 108;
      const delta = completedRound ? 25 : 1;
      meritBatcher.addMerit(currentUser, delta);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);
      roomManager.addCoopProgress(socket.id, completedRound ? 12 : 1, currentUser.dharmaName);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta,
        reason: completedRound ? 'PRAY_BEADS_108_COMPLETE' : 'PRAY_BEADS_STEP'
      });

      if (completedRound) {
        const beadLabel = String(payload.beadLabel || payload.chantText || 'Tràng Hạt Bồ Đề 108 Hạt').slice(0, 50);
        emitThrottledGlobalTicker('PRAY_BEADS_108', 1500, {
          type: 'PRAY_BEADS_108',
          dharmaName: currentUser.dharmaName,
          message: `📿 Đạo hữu "${currentUser.dharmaName}" vừa tĩnh tâm lần viên mãn 1 vòng 108 hạt (${beadLabel}) (+${delta} Công Đức)!`
        });
      }
    });

    // 20. Cập nhật tiến độ Thử Thách 108 Lạy / 27 Lạy hiển thị trên đỉnh đầu nhân vật
    socket.on('update_bow_progress', (payload = {}) => {
      if (!currentUser) return;
      roomManager.updatePlayerBowProgress(socket.id, payload.bowProgressText || '');
      if (payload.completedChallenge) {
        const totalBows = Number(payload.totalBows || 108);
        const bonus = totalBows >= 108 ? 50 : 20;
        meritBatcher.addMerit(currentUser, bonus);
        roomManager.syncUserStatsToPlayer(socket.id, currentUser);
        roomManager.addCoopProgress(socket.id, 15, currentUser.dharmaName);
        socket.emit('merit_updated', {
          meritPoints: currentUser.meritPoints,
          realmLevel: currentUser.realmLevel,
          delta: bonus,
          reason: 'BOW_CHALLENGE_COMPLETE'
        });
        io.emit('zen_ticker', {
          type: 'BOW_CHALLENGE_COMPLETE',
          dharmaName: currentUser.dharmaName,
          message: `🙏 Đạo hữu "${currentUser.dharmaName}" vừa chí thành lễ viên mãn Thử Thách ${totalBows} Lạy Sám Hối (+${bonus} Công Đức)!`
        });
      }
    });

    // 21. Phóng Sinh Tích Phước (Chim Sẻ Hòa Bình, Rùa Vàng Kim Quy, Cá Chép Vàng: +10 Công Đức)
    socket.on('release_life', (payload = {}) => {
      if (!currentUser) return;
      const rawAnimal = String(payload.animalType || 'BIRDS').toUpperCase();
      const animalType = ['BIRDS', 'SPARROW', 'TURTLE', 'KOI_FISH', 'KOI'].includes(rawAnimal)
        ? rawAnimal
        : 'BIRDS';
      const wishText = String(payload.wishText || payload.wish || 'Nguyện chúng sanh bình an, giải trừ oán kết').slice(0, 120);
      const delta = 10;

      meritBatcher.addMerit(currentUser, delta);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);
      roomManager.addCoopProgress(socket.id, 8, currentUser.dharmaName);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta,
        reason: 'RELEASE_LIFE'
      });

      const releaseData = {
        socketId: socket.id,
        dharmaName: currentUser.dharmaName,
        animalType,
        wishText
      };
      const room = roomManager.getPlayerRoom(socket.id);
      if (room) {
        io.to(room.id).emit('life_released', releaseData);
      } else {
        socket.emit('life_released', releaseData);
      }

      const animalLabel =
        animalType === 'TURTLE'
          ? 'Rùa Vàng Kim Quy'
          : animalType === 'KOI' || animalType === 'KOI_FISH'
          ? 'Cá Chép Vàng'
          : 'Đàn Chim Sẻ Hòa Bình';
      emitThrottledGlobalTicker('RELEASE_LIFE', 1500, {
        type: 'RELEASE_LIFE',
        dharmaName: currentUser.dharmaName,
        message: `🕊️ Đạo hữu "${currentUser.dharmaName}" vừa phát tâm phóng sinh ${animalLabel}: "${wishText}" (+${delta} Công Đức).`
      });
    });

    // 22. Nhận Thưởng Điểm Danh Chuỗi Ngày & Nhiệm Vụ Tu Tập Hằng Ngày
    socket.on('claim_daily_reward', (payload = {}) => {
      if (!currentUser) return;
      const bonus = Math.min(50, Math.max(5, Number(payload.bonusMerit || payload.reward || 15)));
      meritBatcher.addMerit(currentUser, bonus);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);
      roomManager.addCoopProgress(socket.id, 5, currentUser.dharmaName);

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta: bonus,
        reason: payload.rewardType === 'CHECKIN' ? 'DAILY_CHECKIN' : 'DAILY_QUEST'
      });
    });

    socket.on('disconnect', () => {
      roomManager.leaveRoom(socket);
    });
  });
}
