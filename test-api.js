const axios = require('axios');
async function test() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'ppsu001',
      password: 'password'
    });
    const token = loginRes.data.token;
    
    const res = await axios.post('http://localhost:3000/api/attendance/permit', {
      lat: 0,
      lng: 0,
      address: 'test',
      photoUrl: null,
      reason: 'test',
      clientTimestamp: new Date().toISOString()
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log(res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}
test();