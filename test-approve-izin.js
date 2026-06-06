const axios = require('axios');

async function test() {
  try {
    // First, get a token (we need to login)
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin', // or whatever admin username is
      password: 'admin123' // or whatever password
    });
    const token = loginRes.data.token;
    console.log('Token:', token);

    // Now check what the last permit ID is (we saw it in check-tables.js)
    // Let's get admin data to find an izin record
    const adminRes = await axios.get('http://localhost:3000/api/attendance/admin', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const izinRecord = adminRes.data.find((item: any) => item.type === 'PERMIT');
    console.log('Izin record found:', izinRecord);

    if (!izinRecord) {
      console.log('No izin record found!');
      return;
    }

    // Now try to approve
    const putRes = await axios.put(
      `http://localhost:3000/api/attendance/record/${izinRecord.id}/status`,
      {
        status: 'APPROVED',
        rejectionReason: null,
        isRequestTable: false
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Approve result:', putRes.data);
  } catch (err: any) {
    console.error('Error:', err.response ? err.response.data : err.message);
    console.error(err.stack);
  }
}

test();
