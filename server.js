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

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Socket.io server
  const io = new Server(server, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    socket.on('updateLocation', (data) => {
      if (data && data.userId) {
        activeLocations.set(String(data.userId), { ...data, socketId: socket.id, lastSeen: Date.now() });
        socket.broadcast.emit('locationUpdated', data);
      }
    });

    socket.on('joinAdminRoom', () => {
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
      io.emit('emergencySignal', { ...data, timestamp: Date.now() });
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

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Full-stack Next.js ready on port ${port}`);
  });
}).catch((err) => {
  console.error('Fatal Error during Next.js app.prepare():', err);
  process.exit(1);
});
