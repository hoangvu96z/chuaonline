// backend/src/roomManager.js
export { ChurchRoomManager } from './churchRoomManager.js';

const DEFAULT_MAX_CAPACITY = Number(process.env.MAX_ROOM_CAPACITY || 60);
const MAX_LEAVES_PER_ROOM = 25;
const INITIAL_LEAVES_COUNT = 16;

export class RoomManager {
  constructor(io, meritBatcher, maxCapacity = DEFAULT_MAX_CAPACITY) {
    this.io = io;
    this.meritBatcher = meritBatcher;
    this.maxCapacity = maxCapacity;

    // Map<roomId, { id, players: Map<socketId, PlayerState>, leaves: Map<leafId, Leaf>, dirty: boolean }>
    this.rooms = new Map();
    this.socketToRoom = new Map(); // socketId -> roomId
    this.leafSeq = 1;

    // Create initial channel chanh-dien-1
    this._getOrCreateRoom('chanh-dien-1');

    // 10Hz (100ms) server broadcast tick (Blueprint Requirement #3)
    this.tickTimer = setInterval(() => this.broadcastRoomStates(), 100);
    if (this.tickTimer.unref) this.tickTimer.unref();

    // Every 60s spawn fallen Banyan leaves if room.leaves.size < 25 (Blueprint Step 2.2)
    this.leafTimer = setInterval(() => this.spawnLeavesTick(), 60000);
    if (this.leafTimer.unref) this.leafTimer.unref();
  }

  _getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const room = {
        id: roomId,
        players: new Map(),
        leaves: new Map(),
        plantedTrees: [], // Bounded up to 24 trees per room
        chatHistory: [],  // Bounded up to 50 recent messages per room
        coopGoalProgress: 15,
        coopGoalTarget: 100,
        coopMiracleCount: 0,
        dirty: false
      };
      this._spawnLeavesInRoom(room, INITIAL_LEAVES_COUNT);
      this.rooms.set(roomId, room);
    }
    return this.rooms.get(roomId);
  }

  _findAvailableRoom(preferredRoomId = null) {
    if (preferredRoomId) {
      const preferred = this._getOrCreateRoom(preferredRoomId);
      if (preferred.players.size < this.maxCapacity) {
        return preferred;
      }
    }

    let channelIdx = 1;
    while (true) {
      const roomId = `chanh-dien-${channelIdx}`;
      const room = this._getOrCreateRoom(roomId);
      if (room.players.size < this.maxCapacity) {
        return room;
      }
      channelIdx++;
    }
  }

  /**
   * Blueprint Step 2.2:
   * Spawn leaves around Banyan tree (x: [-15, 15], z: [10, 30])
   */
  _spawnLeavesInRoom(room, countToSpawn) {
    const newlySpawned = [];
    for (let i = 0; i < countToSpawn; i++) {
      if (room.leaves.size >= MAX_LEAVES_PER_ROOM) break;
      const id = `leaf-${this.leafSeq++}`;
      const leaf = {
        id,
        x: Number((-15 + Math.random() * 30).toFixed(2)),
        z: Number((10 + Math.random() * 20).toFixed(2)),
        rotation: Number((Math.random() * Math.PI * 2).toFixed(2)),
        scale: Number((0.85 + Math.random() * 0.35).toFixed(2))
      };
      room.leaves.set(id, leaf);
      newlySpawned.push(leaf);
    }
    return newlySpawned;
  }

  spawnLeavesTick() {
    for (const room of this.rooms.values()) {
      if (room.players.size === 0 && room.id !== 'chanh-dien-1') continue;
      if (room.leaves.size < MAX_LEAVES_PER_ROOM) {
        const deficit = Math.min(8, MAX_LEAVES_PER_ROOM - room.leaves.size);
        const spawned = this._spawnLeavesInRoom(room, deficit);
        if (spawned.length > 0 && this.io && room.players.size > 0) {
          this.io.to(room.id).emit('leaves_spawned', {
            roomId: room.id,
            leaves: spawned
          });
        }
      }
    }
  }

  joinRoom(socket, user, preferredRoomId = null) {
    // Remove from previous room if switching
    if (this.socketToRoom.has(socket.id)) {
      this.leaveRoom(socket);
    }

    const room = this._findAvailableRoom(preferredRoomId);
    const spawnX = Number(((Math.random() - 0.5) * 6).toFixed(2));
    const spawnZ = Number((5 + Math.random() * 4).toFixed(2));

    const playerState = {
      socketId: socket.id,
      userId: user.id,
      dharmaName: user.dharmaName,
      robeColor: user.robeColor || '#5c6b73',
      avatarStyle: user.avatarStyle || 'CU_SI_AO_LAM',
      companionType: user.companionType || 'MEO_CHUA',
      lotusFootsteps: user.lotusFootsteps !== undefined ? Boolean(user.lotusFootsteps) : true,
      headwearType: user.headwearType || 'AUTO',
      bowProgressText: '',
      provinceCode: user.provinceCode || 'SG',
      meritPoints: user.meritPoints || 0,
      realmLevel: user.realmLevel || 1,
      x: spawnX,
      y: 0,
      z: spawnZ,
      rotY: Math.PI,
      state: 'IDLE',
      cushionIndex: null,
      userRef: user
    };

    room.players.set(socket.id, playerState);
    playerState._dirty = true;
    room.dirty = true;
    room.fullSyncNeeded = true;
    this.socketToRoom.set(socket.id, room.id);

    if (typeof socket.join === 'function') {
      socket.join(room.id);
    }

    if (this.io) {
      socket.to?.(room.id).emit('player_joined', this._serializePlayer(playerState));
    }

    return {
      roomId: room.id,
      player: this._serializePlayer(playerState),
      players: Array.from(room.players.values()).map((p) => this._serializePlayer(p)),
      leaves: Array.from(room.leaves.values()),
      plantedTrees: room.plantedTrees || [],
      chatHistory: room.chatHistory || [],
      coopGoal: {
        progress: room.coopGoalProgress,
        target: room.coopGoalTarget,
        miracleCount: room.coopMiracleCount
      }
    };
  }

  leaveRoom(socket) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.players.delete(socket.id);
      room.dirty = true;
      room.fullSyncNeeded = true;
      if (typeof socket.leave === 'function') {
        socket.leave(roomId);
      }
      if (this.io) {
        this.io.to(roomId).emit('player_left', { socketId: socket.id });
      }
      // Clean up empty overflow shard rooms (keep chanh-dien-1 alive)
      if (room.players.size === 0 && roomId !== 'chanh-dien-1') {
        this.rooms.delete(roomId);
      }
    }
    this.socketToRoom.delete(socket.id);
  }

  updatePlayerMove(socketId, { x, z, rotY, state, cushionIndex }) {
    const room = this.getPlayerRoom(socketId);
    if (!room) return null;
    const player = room.players.get(socketId);
    if (!player) return null;

    if (typeof x === 'number' && !Number.isNaN(x)) {
      player.x = Math.max(-35, Math.min(35, Number(x.toFixed(2))));
    }
    if (typeof z === 'number' && !Number.isNaN(z)) {
      player.z = Math.max(-22, Math.min(46, Number(z.toFixed(2))));
    }
    if (typeof rotY === 'number' && !Number.isNaN(rotY)) {
      player.rotY = Number(rotY.toFixed(3));
    }
    if (state) {
      player.state = state;
    }
    if (cushionIndex !== undefined) {
      player.cushionIndex = cushionIndex;
    }

    player._dirty = true;
    room.dirty = true;
    return player;
  }

  updatePlayerState(socketId, state, cushionIndex = null) {
    const room = this.getPlayerRoom(socketId);
    if (!room) return null;
    const player = room.players.get(socketId);
    if (!player) return null;

    player.state = state || 'IDLE';
    player.cushionIndex = cushionIndex;
    player._dirty = true;
    room.dirty = true;
    return player;
  }

  syncUserStatsToPlayer(socketId, user) {
    const room = this.getPlayerRoom(socketId);
    if (!room) return;
    const player = room.players.get(socketId);
    if (!player) return;

    player.dharmaName = user.dharmaName;
    player.robeColor = user.robeColor;
    if (user.avatarStyle) player.avatarStyle = user.avatarStyle;
    if (user.companionType !== undefined) player.companionType = user.companionType;
    if (user.lotusFootsteps !== undefined) player.lotusFootsteps = Boolean(user.lotusFootsteps);
    if (user.headwearType !== undefined) player.headwearType = user.headwearType;
    player.provinceCode = user.provinceCode;
    player.meritPoints = user.meritPoints;
    player.realmLevel = user.realmLevel;
    player._dirty = true;
    room.dirty = true;
  }

  updatePlayerBowProgress(socketId, bowProgressText = '') {
    const room = this.getPlayerRoom(socketId);
    if (!room) return;
    const player = room.players.get(socketId);
    if (!player) return;
    player.bowProgressText = String(bowProgressText || '').slice(0, 24);
    player._dirty = true;
    room.dirty = true;
  }

  addCoopProgress(socketId, deltaPoints = 2, actorName = 'Đạo Hữu') {
    const room = this.getPlayerRoom(socketId) || this.rooms.get('chanh-dien-1');
    if (!room) return null;

    const add = Math.max(1, Number(deltaPoints || 1));
    room.coopGoalProgress = Math.min(room.coopGoalTarget, (room.coopGoalProgress || 0) + add);

    if (room.coopGoalProgress >= room.coopGoalTarget) {
      room.coopGoalProgress = 0;
      room.coopMiracleCount = (room.coopMiracleCount || 0) + 1;

      const bonusMerit = 20;
      for (const p of room.players.values()) {
        if (p.userRef) {
          this.meritBatcher.addMerit(p.userRef, bonusMerit);
          p.meritPoints = p.userRef.meritPoints;
          p.realmLevel = p.userRef.realmLevel;
          p._dirty = true;
        }
      }
      room.dirty = true;
      room.fullSyncNeeded = true;

      if (this.io) {
        this.io.to(room.id).emit('mandala_flower_rain', {
          roomId: room.id,
          miracleCount: room.coopMiracleCount,
          bonusMerit,
          triggeredBy: actorName,
          progress: room.coopGoalProgress,
          target: room.coopGoalTarget
        });
        this.io.emit('zen_ticker', {
          type: 'MANDALA_MIRACLE',
          dharmaName: actorName,
          message: `🪷 ĐẠI NGUYỆN VIÊN MÃN! Đạo tràng vừa tích đủ 100 thiện niệm — Mưa Hoa Sen Vàng Mạn Đà La giáng lâm, ban tặng +${bonusMerit} Công Đức cho toàn thể đại chúng!`
        });
      }
      return { triggeredMiracle: true, progress: 0, target: room.coopGoalTarget };
    }

    if (this.io) {
      this.io.to(room.id).emit('coop_goal_updated', {
        roomId: room.id,
        progress: room.coopGoalProgress,
        target: room.coopGoalTarget,
        miracleCount: room.coopMiracleCount,
        actorName
      });
    }
    return { triggeredMiracle: false, progress: room.coopGoalProgress, target: room.coopGoalTarget };
  }

  seedRoomChatHistory(roomId = 'chanh-dien-1', messages = []) {
    if (!Array.isArray(messages) || messages.length === 0) return;
    const room = this._getOrCreateRoom(roomId);
    const existingIds = new Set(room.chatHistory.map((m) => m.id));
    for (const msg of messages) {
      if (msg && msg.text && (!msg.id || !existingIds.has(msg.id))) {
        room.chatHistory.push(msg);
        if (msg.id) existingIds.add(msg.id);
      }
    }
    if (room.chatHistory.length > 50) {
      room.chatHistory = room.chatHistory.slice(-50);
    }
  }

  recordRoomChat(socketId, chatPayload) {
    const room = this.getPlayerRoom(socketId) || this._getOrCreateRoom(chatPayload?.roomId || 'chanh-dien-1');
    if (!room) return;
    room.chatHistory.push(chatPayload);
    if (room.chatHistory.length > 50) {
      room.chatHistory.shift();
    }
  }

  recordPlantedTree(socketId, treeData) {
    const room = this.getPlayerRoom(socketId);
    if (!room) return;
    room.plantedTrees.push(treeData);
    if (room.plantedTrees.length > 24) {
      room.plantedTrees.shift();
    }
  }

  /**
   * Blueprint Step 2.2:
   * Khi nhận sự kiện sweep_leaf(leafId):
   * - Kiểm tra room.leaves.has(leafId)
   * - Xóa ngay khỏi Map, gọi meritBatcher.addMerit(user, 5) và phát sự kiện leaf_swept({ leafId, userId, dharmaName }) cho cả phòng.
   */
  sweepLeaf(socketId, leafId) {
    const room = this.getPlayerRoom(socketId);
    if (!room) return null;

    const player = room.players.get(socketId);
    if (!player) return null;

    const key = String(leafId);
    if (!room.leaves.has(key)) {
      return null;
    }

    room.leaves.delete(key);
    const user = player.userRef;
    const meritResult = this.meritBatcher.addMerit(user, 5, { leavesDelta: 1 });
    this.syncUserStatsToPlayer(socketId, user);

    const payload = {
      leafId: key,
      socketId,
      userId: user.id,
      dharmaName: user.dharmaName,
      meritPoints: user.meritPoints,
      realmLevel: user.realmLevel,
      reward: 5
    };

    if (this.io) {
      this.io.to(room.id).emit('leaf_swept', payload);
    }

    // If leaves drop below 5, immediately spawn a few new leaves so players never run out
    if (room.leaves.size < 5) {
      const spawned = this._spawnLeavesInRoom(room, 10);
      if (spawned.length > 0 && this.io) {
        this.io.to(room.id).emit('leaves_spawned', {
          roomId: room.id,
          leaves: spawned
        });
      }
    }

    return { payload, meritResult };
  }

  broadcastRoomStates() {
    if (!this.io) return;
    this._tickCounter = (this._tickCounter || 0) + 1;
    const forceFull = this._tickCounter % 20 === 0;

    for (const room of this.rooms.values()) {
      if (!room.dirty || room.players.size === 0) continue;
      room.dirty = false;

      if (room.fullSyncNeeded || forceFull) {
        room.fullSyncNeeded = false;
        const snapshot = [];
        for (const p of room.players.values()) {
          p._dirty = false;
          snapshot.push(this._serializePlayer(p));
        }
        this.io.to(room.id).emit('room_state_tick', {
          roomId: room.id,
          isDelta: false,
          playerCount: room.players.size,
          players: snapshot
        });
      } else {
        const changed = [];
        for (const p of room.players.values()) {
          if (!p._dirty) continue;
          p._dirty = false;
          changed.push(this._serializePlayer(p));
        }
        if (changed.length > 0) {
          this.io.to(room.id).emit('room_state_tick', {
            roomId: room.id,
            isDelta: true,
            playerCount: room.players.size,
            players: changed
          });
        }
      }
    }
  }

  getPlayerRoom(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  getPlayerState(socketId) {
    const room = this.getPlayerRoom(socketId);
    return room ? room.players.get(socketId) || null : null;
  }

  getStats() {
    const channels = [];
    let totalPlayers = 0;
    for (const room of this.rooms.values()) {
      totalPlayers += room.players.size;
      channels.push({
        roomId: room.id,
        playersCount: room.players.size,
        leavesCount: room.leaves.size,
        maxCapacity: this.maxCapacity
      });
    }
    return { totalPlayers, totalRooms: this.rooms.size, channels };
  }

  _serializePlayer(p) {
    return {
      socketId: p.socketId,
      userId: p.userId,
      dharmaName: p.dharmaName,
      robeColor: p.robeColor,
      avatarStyle: p.avatarStyle || 'CU_SI_AO_LAM',
      companionType: p.companionType || 'MEO_CHUA',
      lotusFootsteps: p.lotusFootsteps !== undefined ? Boolean(p.lotusFootsteps) : true,
      headwearType: p.headwearType || 'AUTO',
      bowProgressText: p.bowProgressText || '',
      provinceCode: p.provinceCode,
      meritPoints: p.meritPoints,
      realmLevel: p.realmLevel,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      state: p.state,
      cushionIndex: p.cushionIndex
    };
  }

  stop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.leafTimer) {
      clearInterval(this.leafTimer);
      this.leafTimer = null;
    }
  }
}
