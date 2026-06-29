const mysql = require('mysql2/promise');
async function test() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'ppsu_monitoring' });
  const [rows] = await pool.query('SELECT * FROM gps_tracking ORDER BY id DESC LIMIT 5');
  console.log(rows);
  process.exit();
}
test();
