// backend/src/churchRoomManager.js
const DEFAULT_MAX_CAPACITY = Number(process.env.MAX_ROOM_CAPACITY || 60);
const MAX_GARDEN_TASKS_PER_ROOM = 25;
const INITIAL_GARDEN_TASKS_COUNT = 16;

export class ChurchRoomManager {
  constructor(io, graceBatcher, maxCapacity = DEFAULT_MAX_CAPACITY) {
    this.io = io;
    this.graceBatcher = graceBatcher;
    this.maxCapacity = maxCapacity;

    // Map<roomId, { id, players: Map<socketId, PlayerState>, gardenTasks: Map<taskId, Task>, chatHistory: Array, dirty: boolean }>
    this.rooms = new Map();
    this.socketToRoom = new Map(); // socketId -> roomId
    this.taskSeq = 1;

    // Create initial channel thanh-duong-1
    this._getOrCreateRoom('thanh-duong-1');

    // 10Hz (100ms) server broadcast tick
    this.tickTimer = setInterval(() => this.broadcastRoomStates(), 100);
    if (this.tickTimer.unref) this.tickTimer.unref();

    // Every 45s spawn rose garden tasks if room.gardenTasks.size < 25 (Blueprint Step 2.2)
    this.gardenTimer = setInterval(() => this.spawnGardenTasks(), 45000);
    if (this.gardenTimer.unref) this.gardenTimer.unref();
  }

  _emitToRoom(roomId, eventName, payload) {
    if (!this.io) return;
    if (typeof this.io.to === 'function') {
      this.io.to(roomId).emit(eventName, payload);
    }
    if (typeof this.io.of === 'function') {
      try {
        this.io.of('/nhatho').to(roomId).emit(eventName, payload);
      } catch (_) {
        // Ignore if mock io
      }
    }
  }

  _getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const room = {
        id: roomId,
        players: new Map(),
        gardenTasks: new Map(),
        chatHistory: [], // Bounded up to 25 recent messages per room
        dirty: false
      };
      this._spawnTasksInRoom(room, INITIAL_GARDEN_TASKS_COUNT);
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
      const roomId = `thanh-duong-${channelIdx}`;
      const room = this._getOrCreateRoom(roomId);
      if (room.players.size < this.maxCapacity) {
        return room;
      }
      channelIdx++;
    }
  }

  /**
   * Blueprint Step 2.2:
   * Spawn rose garden tasks in the Marian Rosary Garden & Courtyard (x: [-16, 16], z: [10, 32])
   */
  _spawnTasksInRoom(room, countToSpawn) {
    const newlySpawned = [];
    const roseColors = ['WHITE_ROSE', 'RED_ROSE', 'GOLD_ROSE', 'PINK_ROSE'];
    for (let i = 0; i < countToSpawn; i++) {
      if (room.gardenTasks.size >= MAX_GARDEN_TASKS_PER_ROOM) break;
      const id = `rose-${this.taskSeq++}`;
      const task = {
        id,
        x: Number((-16 + Math.random() * 32).toFixed(2)),
        z: Number((10 + Math.random() * 22).toFixed(2)),
        rotation: Number((Math.random() * Math.PI * 2).toFixed(2)),
        scale: Number((0.85 + Math.random() * 0.35).toFixed(2)),
        roseType: roseColors[this.taskSeq % roseColors.length]
      };
      room.gardenTasks.set(id, task);
      newlySpawned.push(task);
    }
    return newlySpawned;
  }

  spawnGardenTasks() {
    for (const room of this.rooms.values()) {
      if (room.players.size === 0 && room.id !== 'thanh-duong-1') continue;
      if (room.gardenTasks.size < MAX_GARDEN_TASKS_PER_ROOM) {
        const deficit = Math.min(8, MAX_GARDEN_TASKS_PER_ROOM - room.gardenTasks.size);
        const spawned = this._spawnTasksInRoom(room, deficit);
        if (spawned.length > 0 && room.players.size > 0) {
          this._emitToRoom(room.id, 'garden_tasks_spawned', {
            roomId: room.id,
            tasks: spawned,
            gardenTasks: spawned
          });
        }
      }
    }
  }

  joinRoom(socket, user, preferredRoomId = null) {
    if (this.socketToRoom.has(socket.id)) {
      this.leaveRoom(socket);
    }

    const room = this._findAvailableRoom(preferredRoomId);
    const spawnX = Number(((Math.random() - 0.5) * 6).toFixed(2));
    const spawnZ = Number((6 + Math.random() * 4).toFixed(2));

    const playerState = {
      socketId: socket.id,
      userId: user.id,
      christianName: user.christianName || 'Tín Hữu',
      outfitColor: user.outfitColor || '#f5f0e6',
      avatarStyle: user.avatarStyle || 'GIAO_DAN_AO_DAI',
      dioceseCode: user.dioceseCode || 'SG',
      gracePoints: user.gracePoints || 0,
      virtueTier: user.virtueTier || 1,
      x: spawnX,
      y: 0,
      z: spawnZ,
      rotY: Math.PI,
      state: 'IDLE',
      pewIndex: null,
      userRef: user
    };

    room.players.set(socket.id, playerState);
    room.dirty = true;
    this.socketToRoom.set(socket.id, room.id);

    if (typeof socket.join === 'function') {
      socket.join(room.id);
    }

    const serialized = this._serializePlayer(playerState);
    if (typeof socket.to === 'function') {
      socket.to(room.id).emit('player_joined', serialized);
    }

    return {
      roomId: room.id,
      player: serialized,
      players: Array.from(room.players.values()).map((p) => this._serializePlayer(p)),
      gardenTasks: Array.from(room.gardenTasks.values()),
      chatHistory: room.chatHistory || []
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
      this._emitToRoom(roomId, 'player_left', { socketId: socket.id });
      // Clean up empty overflow shard rooms (keep thanh-duong-1 alive)
      if (room.players.size === 0 && roomId !== 'thanh-duong-1') {
        this.rooms.delete(roomId);
      }
    }
    this.socketToRoom.delete(socket.id);
  }

  updatePlayerMove(socketId, { x, z, rotY, state, pewIndex }) {
    const room = this.getPlayerRoom(socketId);
    if (!room) return null;
    const player = room.players.get(socketId);
    if (!player) return null;

    if (typeof x === 'number' && !Number.isNaN(x)) {
      player.x = Math.max(-35, Math.min(35, Number(x.toFixed(2))));
    }
    if (typeof z === 'number' && !Number.isNaN(z)) {
      player.z = Math.max(-24, Math.min(46, Number(z.toFixed(2))));
    }
    if (typeof rotY === 'number' && !Number.isNaN(rotY)) {
      player.rotY = Number(rotY.toFixed(3));
    }
    if (state) {
      player.state = state;
    }
    if (pewIndex !== undefined) {
      player.pewIndex = pewIndex;
    }

    room.dirty = true;
    return player;
  }

  updatePlayerState(socketId, state, pewIndex = null) {
    const room = this.getPlayerRoom(socketId);
    if (!room) return null;
    const player = room.players.get(socketId);
    if (!player) return null;

    player.state = state || 'IDLE';
    player.pewIndex = pewIndex;
    room.dirty = true;
    return player;
  }

  syncUserStatsToPlayer(socketId, user) {
    const room = this.getPlayerRoom(socketId);
    if (!room) return;
    const player = room.players.get(socketId);
    if (!player) return;

    player.christianName = user.christianName;
    player.outfitColor = user.outfitColor;
    if (user.avatarStyle) player.avatarStyle = user.avatarStyle;
    player.dioceseCode = user.dioceseCode;
    player.gracePoints = user.gracePoints;
    player.virtueTier = user.virtueTier;
    room.dirty = true;
  }

  recordRoomChat(socketId, chatPayload) {
    const room = this.getPlayerRoom(socketId);
    if (!room) return;
    room.chatHistory.push(chatPayload);
    if (room.chatHistory.length > 25) {
      room.chatHistory.shift();
    }
  }

  /**
   * Blueprint Step 2.2:
   * Khi nhận sự kiện tend_garden(taskId):
   * - Kiểm tra room.gardenTasks.has(taskId)
   * - Xóa ngay khỏi Map, gọi graceBatcher.addGrace(user, 5) và phát sự kiện garden_task_tended cho cả phòng.
   */
  tendGardenTask(socketId, taskId) {
    const room = this.getPlayerRoom(socketId);
    if (!room) return null;

    const player = room.players.get(socketId);
    if (!player) return null;

    const key = String(taskId);
    if (!room.gardenTasks.has(key)) {
      return null;
    }

    room.gardenTasks.delete(key);
    const user = player.userRef;
    const graceResult = this.graceBatcher.addGrace(user, 5, { gardenDelta: 1 });
    this.syncUserStatsToPlayer(socketId, user);

    const payload = {
      taskId: key,
      socketId,
      userId: user.id,
      christianName: user.christianName,
      gracePoints: user.gracePoints,
      virtueTier: user.virtueTier,
      reward: 5
    };

    this._emitToRoom(room.id, 'garden_task_tended', payload);

    // If tasks drop below 5, immediately spawn new rose bushes so players never run out
    if (room.gardenTasks.size < 5) {
      const spawned = this._spawnTasksInRoom(room, 10);
      if (spawned.length > 0) {
        this._emitToRoom(room.id, 'garden_tasks_spawned', {
          roomId: room.id,
          tasks: spawned,
          gardenTasks: spawned
        });
      }
    }

    return { payload, graceResult };
  }

  broadcastRoomStates() {
    if (!this.io) return;
    for (const room of this.rooms.values()) {
      if (!room.dirty || room.players.size === 0) continue;
      room.dirty = false;
      const snapshot = Array.from(room.players.values()).map((p) => this._serializePlayer(p));
      this._emitToRoom(room.id, 'room_state_tick', {
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
        gardenTasksCount: room.gardenTasks.size,
        maxCapacity: this.maxCapacity
      });
    }
    return { totalPlayers, totalRooms: this.rooms.size, channels };
  }

  _serializePlayer(p) {
    return {
      socketId: p.socketId,
      userId: p.userId,
      christianName: p.christianName,
      outfitColor: p.outfitColor,
      avatarStyle: p.avatarStyle || 'GIAO_DAN_AO_DAI',
      dioceseCode: p.dioceseCode,
      gracePoints: p.gracePoints,
      virtueTier: p.virtueTier,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      state: p.state,
      pewIndex: p.pewIndex
    };
  }

  stop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.gardenTimer) {
      clearInterval(this.gardenTimer);
      this.gardenTimer = null;
    }
  }
}
