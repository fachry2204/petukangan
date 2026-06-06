const axios = require('axios');

async function test() {
  try {
    // First log in
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin', // use your admin username
      password: 'admin123' // use your admin password
    });
    const token = loginRes.data.token;
    console.log('Login successful, token:', token);

    // Fetch admin attendance data
    const adminRes = await axios.get('http://localhost:3000/api/attendance/admin', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Admin attendance data length:', adminRes.data.length);
    console.log('First 3 items:', JSON.stringify(adminRes.data.slice(0, 3), null, 2));
    const permitItems = adminRes.data.filter(item => item.type === 'PERMIT' || item.type === 'EARLY_OUT');
    console.log('Permit/Early out items:', permitItems);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

test();
