const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory active locations for GPS tracking
const activeLocations = new Map();

// MySQL connection pool (shared between socket.io and auto-migration)
let dbPool = null;
try {
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

app.prepare().then(async () => {
  // Run auto-migration before starting server
  await runAutoMigration();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Socket.io server
  const io = new Server(server, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false,
    },
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

        const locationData = {
          userId: data.userId,
          fullName: data.fullName ?? prev.fullName,
          photoUrl: data.photoUrl ?? prev.photoUrl,
          status: data.status || prev.status || 'Online',
          lat: hasNewCoords ? data.lat : prev.lat ?? null,
          lng: hasNewCoords ? data.lng : prev.lng ?? null,
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
        if (dbPool && hasNewCoords) {
          try {
            await dbPool.execute(
              `INSERT INTO gps_tracking (userId, lat, lng, speed, batteryLevel, isMock, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, NOW(6))`,
              [data.userId, data.lat, data.lng, data.speed || null, data.batteryLevel || null, data.isMock ? 1 : 0]
            );
          } catch (dbErr) {
            // Silently ignore DB errors in socket handler
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

        // Find and disconnect the target socket
        for (const [uid, loc] of activeLocations.entries()) {
          if (uid === userIdStr && loc.socketId) {
            const targetSocket = io.sockets.sockets.get(loc.socketId);
            if (targetSocket) {
              targetSocket.emit('forceLogout');
              targetSocket.disconnect();
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
