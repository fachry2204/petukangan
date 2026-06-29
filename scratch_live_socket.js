const io = require('socket.io-client');
const socketUrl = 'https://cms.petukanganutara.id';
const socket = io(socketUrl, {
  path: '/socket.io',
  transports: ['polling'], 
  auth: { userId: 999, fullName: 'Test Bot', token: 'dummy' }
});

socket.on('connect', () => {
  console.log('Connected to LIVE socket successfully!', socket.id);
  socket.emit('updateLocation', {
    userId: 999,
    lat: -6.2,
    lng: 106.8,
    status: 'Online',
    timestamp: Date.now()
  });
  console.log('Emitted updateLocation to live server');
  setTimeout(() => process.exit(0), 3000);
});

socket.on('connect_error', (err) => {
  console.error('LIVE Socket Connect Error:', err.message);
  process.exit(1);
});
