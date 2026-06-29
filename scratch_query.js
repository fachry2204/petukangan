const { queryDb } = require('./src/lib/db.ts'); // Can't require ts directly from node.
// Use mysql instead
const mysql = require('mysql2/promise');
async function test() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'ppsu_monitoring' });
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  console.log("Cutoff date:", cutoff);
  const sql = `SELECT g.*, u.fullName
       FROM gps_tracking g
       INNER JOIN (
         SELECT userId, MAX(timestamp) AS maxTs
         FROM gps_tracking
         WHERE timestamp >= ?
         GROUP BY userId
       ) latest ON g.userId = latest.userId AND g.timestamp = latest.maxTs
       LEFT JOIN users u ON u.id = g.userId
       WHERE g.timestamp >= ?`;
  const [rows] = await pool.execute(sql, [cutoff, cutoff]);
  console.log("Rows returned:", rows);
  
  // also what does MySQL think NOW() is?
  const [now] = await pool.query('SELECT NOW() as db_now');
  console.log('DB Now:', now[0].db_now);
  process.exit();
}
test();
