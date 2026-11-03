// backend/src/index.js
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { db } from './db.js';
import { MeritBatcher } from './meritBatcher.js';
import { RoomManager } from './roomManager.js';
import { SutraScheduler } from './sutraScheduler.js';
import { registerSocketHandlers } from './socketHandlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export async function createTempleServer(options = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  if (options.forceMemory) {
    db.forceMemoryMode();
  }
  const dbStatus = await db.initDatabase();

  const flushIntervalMs = Number(
    options.flushIntervalMs || process.env.MERIT_FLUSH_INTERVAL_MS || 15000
  );
  const maxRoomCapacity = Number(
    options.maxRoomCapacity || process.env.MAX_ROOM_CAPACITY || 60
  );

  const meritBatcher = new MeritBatcher(db, io, flushIntervalMs);
  const roomManager = new RoomManager(io, meritBatcher, maxRoomCapacity);
  const sutraScheduler = new SutraScheduler(io);

  registerSocketHandlers(io, {
    db,
    roomManager,
    meritBatcher,
    sutraScheduler
  });

  // ==========================================================================
  // REST API ENDPOINTS
  // ==========================================================================
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      dbMode: db.isUsingMemory() ? 'in-memory-fallback' : 'mysql-online',
      dbStatus,
      rooms: roomManager.getStats(),
      globalSutra: sutraScheduler.getCurrentSessionInfo(),
      bufferedMeritUsers: meritBatcher.userMeritBuffer.size
    });
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const lb = await db.getLeaderboards();
      res.json(lb);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/wishes', async (req, res) => {
    try {
      const wishes = await db.getActiveWishes(30);
      res.json({ wishes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/fortunes/random', async (req, res) => {
    try {
      const fortune = await db.getRandomFortune();
      res.json(fortune);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/trigger-global-sutra', (req, res) => {
    const sutraId = req.body?.sutraId || 'bat-nha-tam-kinh';
    const session = sutraScheduler.triggerGlobalSession(sutraId);
    res.json({ ok: true, session });
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      await meritBatcher.flushToDatabase().catch(() => {});
      const result = await db.registerAccount(req.body || {});
      if (!result.ok) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      await meritBatcher.flushToDatabase().catch(() => {});
      const result = await db.loginAccount(req.body || {});
      if (!result.ok) {
        return res.status(401).json(result);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Serve built frontend static files in production if available
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));

  return {
    app,
    httpServer,
    io,
    db,
    meritBatcher,
    roomManager,
    sutraScheduler,
    async close() {
      meritBatcher.stop();
      roomManager.stop();
      sutraScheduler.stop();
      await meritBatcher.flushToDatabase().catch(() => {});
      await new Promise((resolve) => io.close(resolve));
      await new Promise((resolve) => {
        if (httpServer.listening) httpServer.close(resolve);
        else resolve();
      });
      await db.close().catch(() => {});
    }
  };
}

// Run directly when executed as main entry point (supports both `node src/index.js` and PM2 ProcessContainerFork)
const isMain =
  process.env.pm_id !== undefined ||
  (process.argv[1] &&
    (path.resolve(process.argv[1]) === __filename || process.argv[1].endsWith('src/index.js')));
if (isMain) {
  const PORT = Number(process.env.PORT || 3001);
  createTempleServer().then(({ httpServer, db }) => {
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(
        `🪷 [Chùa Online 3D Backend] Listening on http://0.0.0.0:${PORT} (DB mode: ${
          db.isUsingMemory() ? 'In-Memory Fallback' : 'MySQL Online'
        })`
      );
    });
  });
}
