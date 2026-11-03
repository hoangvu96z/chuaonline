// backend/src/roomManager.js
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
    room.dirty = true;
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
      leaves: Array.from(room.leaves.values())
    };
  }

  leaveRoom(socket) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.players.delete(socket.id);
      room.dirty = true;
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
      player.x = Math.max(-30, Math.min(30, Number(x.toFixed(2))));
    }
    if (typeof z === 'number' && !Number.isNaN(z)) {
      player.z = Math.max(-20, Math.min(45, Number(z.toFixed(2))));
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
    player.provinceCode = user.provinceCode;
    player.meritPoints = user.meritPoints;
    player.realmLevel = user.realmLevel;
    room.dirty = true;
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
    for (const room of this.rooms.values()) {
      if (!room.dirty || room.players.size === 0) continue;
      room.dirty = false;
      const snapshot = Array.from(room.players.values()).map((p) => this._serializePlayer(p));
      this.io.to(room.id).emit('room_state_tick', {
        roomId: room.id,
        players: snapshot
      });
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
