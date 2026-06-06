const mysql = require('mysql2/promise');

async function checkData() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });

  try {
    // Cari user dengan username PPSU001 (seperti di gambar)
    const [users] = await conn.execute(`SELECT * FROM users WHERE username = ?`, ['PPSU001']);
    if (!users.length) {
      console.log('User PPSU001 tidak ditemukan!');
      return;
    }
    const userId = users[0].id;
    console.log('User PPSU001 found with ID:', userId);

    // Hitung today's date (WIB like FIXED API)
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    wibTime.setUTCHours(0, 0, 0, 0);
    const todayStr = wibTime.toISOString().split('T')[0];
    console.log('Today (WIB):', todayStr);

    // Ambil attendance hari ini untuk user ini
    const [attendance] = await conn.execute(`SELECT * FROM attendance WHERE userId = ? AND DATE(timestamp) = ?`, [userId, todayStr]);
    console.log('\nAttendance hari ini:', attendance);
    
    // Ambil semua izin user untuk melihat tanggalnya
    const [allPermits] = await conn.execute(`SELECT * FROM attendance WHERE userId = ? AND type IN ('PERMIT', 'EARLY_OUT') ORDER BY id DESC LIMIT 5`, [userId]);
    console.log('\n5 Izin terakhir:', allPermits);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

checkData();
