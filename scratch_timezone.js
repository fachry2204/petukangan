const mysql = require('mysql2/promise');
async function test() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'ppsu_monitoring' });
  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  console.log("Node Cutoff date:", cutoff, "Local:", cutoff.toLocaleString());
  
  const [rows] = await pool.execute("SELECT ? as formatted_cutoff", [cutoff]);
  console.log("MySQL saw cutoff as:", rows[0].formatted_cutoff);
  
  const [nowRows] = await pool.query('SELECT NOW() as db_now, @@global.time_zone, @@session.time_zone');
  console.log('DB Timezone config:', nowRows[0]);
  process.exit();
}
test();
