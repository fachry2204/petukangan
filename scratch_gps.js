const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });
  
  const [rows] = await pool.query('SELECT * FROM gps_tracking ORDER BY timestamp DESC LIMIT 5');
  console.log('Recent gps_tracking:', rows);
  
  const [users] = await pool.query('SELECT id, fullName FROM users LIMIT 3');
  console.log('Users:', users);
  
  process.exit(0);
}
main();
