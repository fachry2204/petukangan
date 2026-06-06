const jwt = require('jsonwebtoken');
const axios = require('axios');

async function test() {
  try {
    const secret = 'ppsusmartmonitoring2026';
    const token = jwt.sign({ sub: 1, role: 'PPSU', username: 'testuser' }, secret, { expiresIn: '1d' });
      
    // Create a dummy large base64 string (e.g. 1MB)
    const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(1024 * 1024);
    
    const res = await axios.post('http://localhost:3000/api/attendance/permit', {
      lat: -6.1234,
      lng: 106.1234,
      address: 'Izin test',
      photoUrl: largeBase64,
      reason: 'Kategori: Sakit | Alasan: Sakit gigi',
      clientTimestamp: new Date().toISOString()
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}
test();