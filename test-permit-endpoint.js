const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testPermit() {
  try {
    const secret = 'ppsusmartmonitoring2026';
    const token = jwt.sign({ sub: 1, role: 'PPSU', username: 'testuser' }, secret, { expiresIn: '1d' });
    
    console.log('Testing /api/attendance/permit...');
    console.log('Token:', token.substring(0, 50) + '...');
    
    const res = await axios.post('http://localhost:3000/api/attendance/permit', {
      lat: -6.1234,
      lng: 106.1234,
      address: 'Izin Tidak Masuk',
      photoUrl: null,
      reason: 'Kategori: Sakit | Alasan: Test',
      clientTimestamp: new Date().toISOString()
    }, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    console.log('Success! Response:', res.data);
    
  } catch (err) {
    console.error('Error details:');
    console.error('- Status:', err.response?.status);
    console.error('- Data:', err.response?.data);
    console.error('- Message:', err.message);
  }
}

testPermit();
