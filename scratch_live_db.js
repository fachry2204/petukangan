const mysql = require('mysql2/promise');

async function test() {
  try {
    const pool = mysql.createPool({ 
      host: 'garudaserver.cloud', 
      user: 'petukangan', 
      password: 'Bangbens220488!', 
      database: 'petukangan',
      connectTimeout: 10000
    });
    
    console.log("Connected to Plesk DB. Describing gps_tracking...");
    const [desc] = await pool.query('DESCRIBE gps_tracking');
    console.log("Columns:", desc.map(c => c.Field));
    
    const [rows] = await pool.query('SELECT * FROM gps_tracking ORDER BY id DESC LIMIT 5');
    console.log("Latest rows:", rows);

    process.exit(0);
  } catch (err) {
    console.error("Error connecting or querying:", err);
    process.exit(1);
  }
}
test();
