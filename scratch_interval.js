const mysql = require('mysql2/promise');
async function test() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'ppsu_monitoring' });
  const minutes = 60;
  
  const sql = `SELECT g.*, u.fullName
       FROM gps_tracking g
       INNER JOIN (
         SELECT userId, MAX(timestamp) AS maxTs
         FROM gps_tracking
         WHERE timestamp >= NOW() - INTERVAL ? MINUTE
         GROUP BY userId
       ) latest ON g.userId = latest.userId AND g.timestamp = latest.maxTs
       LEFT JOIN users u ON u.id = g.userId
       WHERE g.timestamp >= NOW() - INTERVAL ? MINUTE`;
  const [rows] = await pool.execute(sql, [minutes, minutes]);
  console.log("Rows returned:", rows);
  
  process.exit();
}
test();
