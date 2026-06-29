const io = require('socket.io-client');
const socket = io('http://localhost:3000', {
  auth: { userId: 102, fullName: 'Budi Santosos', token: 'mock' }
});
socket.on('connect', () => {
  console.log('Connected', socket.id);
  socket.emit('updateLocation', {
    userId: 102,
    lat: -6.2,
    lng: 106.8,
    status: 'Online',
    timestamp: Date.now()
  });
  console.log('Emitted updateLocation');
  setTimeout(() => {
    socket.disconnect();
    process.exit();
  }, 2000);
});
socket.on('connect_error', (err) => console.log('Err:', err));
