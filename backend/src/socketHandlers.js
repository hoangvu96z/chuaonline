// backend/src/socketHandlers.js
export function registerSocketHandlers(io, { db, roomManager, meritBatcher, sutraScheduler }) {
  let lastGreatBellRungAt = 0;

  io.on('connection', (socket) => {
    let currentUser = null;

    // 1. Join Temple & Assign Sharded Room (Max 60 players/room)
    socket.on('join_temple', async (payload = {}) => {
      try {
        currentUser = await db.getOrCreateUser({
          recoveryCode: payload.recoveryCode,
          dharmaName: payload.dharmaName,
          robeColor: payload.robeColor,
          provinceCode: payload.provinceCode
        });

        const joinResult = roomManager.joinRoom(socket, currentUser, payload.preferredRoomId);
        const wishes = await db.getActiveWishes(25);
        const globalSutra = sutraScheduler.getCurrentSessionInfo();

        socket.emit('temple_joined', {
          user: currentUser,
          roomId: joinResult.roomId,
          player: joinResult.player,
          players: joinResult.players,
          leaves: joinResult.leaves,
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
      const isGlobal =
        sutraScheduler.isGlobalSessionActive() &&
        pState &&
        pState.cushionIndex !== null &&
        pState.cushionIndex !== undefined;

      const delta = isGlobal ? 10 : 5;
      meritBatcher.addMerit(currentUser, delta);
      roomManager.updatePlayerState(socket.id, 'PROSTRATE', pState?.cushionIndex ?? 2);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);

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
          bowNumber: payload.bowNumber || 1
        });
      }

      if (payload.bowNumber === 3) {
        io.emit('zen_ticker', {
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
        socket.emit('merit_updated', {
          meritPoints: currentUser.meritPoints,
          realmLevel: currentUser.realmLevel,
          delta: 5,
          reason: 'SWEEP_LEAF'
        });
      }
    });

    // 9. Make Wish: Offer Incense or Release Lotus Lantern (+10 Công Đức)
    socket.on('make_wish', async (payload = {}) => {
      if (!currentUser) return;
      const content = String(payload.content || '').trim();
      if (!content) return;

      const wishType = payload.wishType === 'LANTERN' ? 'LANTERN' : 'INCENSE';
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

      socket.emit('merit_updated', {
        meritPoints: currentUser.meritPoints,
        realmLevel: currentUser.realmLevel,
        delta: 10,
        reason: wishType
      });

      io.emit('new_wish', savedWish);
      const actionLabel = wishType === 'LANTERN' ? 'thả đèn Hoa Đăng' : 'dâng nén Tâm Hương';
      io.emit('zen_ticker', {
        type: 'WISH',
        dharmaName: currentUser.dharmaName,
        wishType,
        message: `🪷 Đạo hữu "${currentUser.dharmaName}" vừa ${actionLabel} cầu nguyện: "${content.slice(0, 80)}"`
      });
    });

    // 10. Ring Great Bell (Thỉnh Đại Hồng Chung)
    socket.on('ring_great_bell', (payload = {}) => {
      if (!currentUser) return;
      const now = Date.now();
      meritBatcher.addMerit(currentUser, 2);
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);

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

      if (now - lastGreatBellRungAt > 4000) {
        lastGreatBellRungAt = now;
        io.emit('zen_ticker', {
          type: 'GREAT_BELL',
          dharmaName: currentUser.dharmaName,
          message: `🔔 Đạo hữu "${currentUser.dharmaName}" vừa thỉnh Đại Hồng Chung cầu quốc thái dân an.`
        });
      }
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

    // 12. Update Profile (Pháp Danh, Tỉnh Thành, Màu Áo Lam)
    socket.on('update_profile', async (payload = {}) => {
      if (!currentUser) return;
      if (payload.dharmaName) currentUser.dharmaName = String(payload.dharmaName).slice(0, 50);
      if (payload.robeColor) currentUser.robeColor = String(payload.robeColor).slice(0, 16);
      if (payload.provinceCode) currentUser.provinceCode = String(payload.provinceCode).slice(0, 10);

      await db.updateUserProfile(currentUser.id, {
        dharmaName: currentUser.dharmaName,
        robeColor: currentUser.robeColor,
        provinceCode: currentUser.provinceCode
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
        leaves: joinResult.leaves
      });
    });

    // 14. Request Leaderboard
    socket.on('get_leaderboard', async () => {
      const lb = await db.getLeaderboards();
      socket.emit('leaderboard_data', lb);
    });

    // 15. Sync Account after Login / Register
    socket.on('auth_sync_account', (payload = {}) => {
      if (!payload || !payload.user) return;
      currentUser = {
        ...currentUser,
        ...payload.user
      };
      roomManager.syncUserStatsToPlayer(socket.id, currentUser);
      socket.emit('account_synced', { user: currentUser });
    });

    socket.on('disconnect', () => {
      roomManager.leaveRoom(socket);
    });
  });
}
