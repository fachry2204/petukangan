const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { loadEnvConfig } = require('@next/env');

// Load environment variables synchronously from .env files BEFORE evaluating process.env
loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory active locations for GPS tracking
const activeLocations = new Map();

// MySQL connection pool (shared between socket.io and auto-migration)
let dbPool = null;
try {
  console.log('[Server] Connecting to MySQL at host:', process.env.DB_HOST || 'localhost');
  console.log('[Server] Using DB_USER:', process.env.DB_USER || 'root');
  console.log('[Server] Using DB_NAME:', process.env.DB_NAME || 'ppsu_monitoring');
  
  const mysql = require('mysql2/promise');
  dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ppsu_monitoring',
    waitForConnections: true,
    connectionLimit: 10,
  });
  console.log('[Server] MySQL pool ready');
} catch (e) {
  console.log('[Server] MySQL not available:', e.message);
}

// Auto-migration: ensure required tables exist
async function runAutoMigration() {
  if (!dbPool) return;
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS sos_signals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(100),
        date_sos DATE,
        time_sos TIME,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        address TEXT,
        map_link TEXT,
        status ENUM('DARURAT', 'PETUGAS MELUNCUR', 'SELESAI') DEFAULT 'DARURAT',
        resolved_by INT,
        resolved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS gps_tracking (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        lat DECIMAL(10,8) NOT NULL,
        lng DECIMAL(11,8) NOT NULL,
        speed DECIMAL(5,2) DEFAULT NULL,
        batteryLevel INT DEFAULT NULL,
        isMock TINYINT(1) DEFAULT 0,
        ipAddress VARCHAR(45) DEFAULT NULL,
        wifiName VARCHAR(100) DEFAULT NULL,
        provider VARCHAR(50) DEFAULT NULL,
        statusAbsen VARCHAR(30) DEFAULT NULL,
        timestamp DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_userId (userId),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[Server] Auto-migration completed');
  } catch (err) {
    console.error('[Server] Auto-migration skipped:', err.message);
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371e3; // Radius bumi dalam meter
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Jarak dalam meter
}

app.prepare().then(async () => {
  // Run auto-migration before starting server
  await runAutoMigration();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    if (parsedUrl.pathname === '/internal/socket-emit' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          if (global.io) {
            global.io.emit(payload.event, payload.data);
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
    handle(req, res, parsedUrl);
  });

  // Socket.io server
  const io = new Server(server, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    cors: { origin: '*' },
    maxHttpBufferSize: 5e6,
  });

  // Expose io globally so Next.js API routes can emit realtime events
  global.io = io;
  global.activeLocations = activeLocations;

  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Store auth info from handshake
    const auth = socket.handshake.auth || {};
    if (auth.userId) {
      activeLocations.set(String(auth.userId), {
        userId: auth.userId,
        fullName: auth.fullName || auth.username || 'Unknown',
        photoUrl: auth.photoUrl || null,
        lat: null,
        lng: null,
        lastSavedLat: null,
        lastSavedLng: null,
        gpsStatus: false,
        timestamp: Date.now(),
        socketId: socket.id,
        device: socket.handshake.headers['user-agent'] || 'Unknown',
      });
      io.emit('userOnline', { userId: auth.userId, fullName: auth.fullName });
    }

    socket.on('updateLocation', async (data) => {
      if (data && data.userId) {
        const prev = activeLocations.get(String(data.userId)) || {};
        const hasNewCoords = data.lat != null && data.lng != null;

        let shouldSaveToDb = false;
        if (hasNewCoords) {
          const dist = calculateDistance(prev.lastSavedLat, prev.lastSavedLng, data.lat, data.lng);
          // Hanya simpan ke DB jika ini titik pertama ATAU jarak bergerak lebih dari 10 meter
          if (dist > 10) {
            shouldSaveToDb = true;
          }
        }

        const locationData = {
          userId: data.userId,
          fullName: data.fullName ?? prev.fullName,
          photoUrl: data.photoUrl ?? prev.photoUrl,
          status: data.status || prev.status || 'Online',
          lat: hasNewCoords ? data.lat : prev.lat ?? null,
          lng: hasNewCoords ? data.lng : prev.lng ?? null,
          lastSavedLat: shouldSaveToDb ? data.lat : prev.lastSavedLat ?? null,
          lastSavedLng: shouldSaveToDb ? data.lng : prev.lastSavedLng ?? null,
          gpsStatus: hasNewCoords ? !!data.gpsStatus : prev.gpsStatus ?? false,
          timestamp: data.timestamp || Date.now(),
          device: data.device || prev.device || 'Unknown',
          os: data.os || prev.os || 'Unknown',
          provider: data.provider || prev.provider || '',
          socketId: socket.id,
          lastSeen: Date.now(),
        };

        activeLocations.set(String(data.userId), locationData);
        io.emit('locationUpdated', locationData);

        // Save to database for history
        if (dbPool && shouldSaveToDb) {
          try {
            await dbPool.execute(
              `INSERT INTO gps_tracking (userId, lat, lng, speed, batteryLevel, isMock, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, NOW(6))`,
              [data.userId, data.lat, data.lng, data.speed || null, data.batteryLevel || null, data.isMock ? 1 : 0]
            );
          } catch (dbErr) {
            console.error('[Socket] Failed to insert GPS tracking data:', dbErr.message);
          }
        }
      }
    });

    socket.on('joinAdminRoom', () => {
      socket.join('admin-room');
      const list = Array.from(activeLocations.values()).map((l) => ({
        userId: l.userId,
        fullName: l.fullName,
        photoUrl: l.photoUrl,
        status: l.status,
        lat: l.lat,
        lng: l.lng,
        gpsStatus: l.gpsStatus,
        timestamp: l.timestamp,
        device: l.device,
        os: l.os,
        provider: l.provider,
      }));
      socket.emit('activeLocationsSync', list);
    });

    socket.on('emergencySignal', (data) => {
      const dateObj = new Date(data.timestamp || Date.now());
      const gmt7Date = new Date(dateObj.getTime() + (7 * 60 * 60 * 1000));
      const dateSos = gmt7Date.toISOString().split('T')[0];
      const timeSos = gmt7Date.toISOString().split('T')[1].split('.')[0];
      const mapLink = `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`;

      io.emit('emergencySignal', {
        userId: data.userId,
        fullName: data.fullName,
        photoUrl: data.photoUrl,
        phone: data.phone,
        lat: data.lat,
        lng: data.lng,
        address: data.address,
        dateSos,
        timeSos,
        mapLink,
        status: 'DARURAT',
        timestamp: data.timestamp || Date.now(),
      });
    });

    socket.on('forceLogoutUser', async (data) => {
      if (data && data.userId) {
        const userIdStr = String(data.userId);
        const userIdNum = Number(data.userId);

        // Find and disconnect the target socket on the server side
        for (const [uid, loc] of activeLocations.entries()) {
          if (uid === userIdStr && loc.socketId) {
            const targetSocket = io.sockets.sockets.get(loc.socketId);
            if (targetSocket) {
              // We don't disconnect immediately here because polling might drop the packet.
              // We just broadcast the forceLogout event globally.
              setTimeout(() => targetSocket.disconnect(), 2000);
            }
            break;
          }
        }

        activeLocations.delete(userIdStr);

        // Remove from database
        if (dbPool) {
          try {
            await dbPool.execute('DELETE FROM gps_tracking WHERE userId = ?', [userIdNum]);
          } catch (dbErr) {
            console.error('[Socket] Failed to delete GPS records:', dbErr);
          }
        }

        // Broadcast to all clients so the specific user's HP will catch it and log out
        io.emit('forceLogout', { userId: userIdNum });
        io.emit('userOffline', { userId: userIdNum });
        console.log('[Socket] Force logout user:', userIdNum);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id);
      for (const [userId, loc] of activeLocations.entries()) {
        if (loc.socketId === socket.id) {
          activeLocations.delete(userId);
          io.emit('userOffline', { userId: Number(userId) });
          break;
        }
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Next.js full-stack ready on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Fatal Error during Next.js app.prepare():', err);
  process.exit(1);
});
