const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function seedAdmin() {
  const hash = await bcrypt.hash('admin123', 10);
  console.log('Generated hash:', hash);

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });

  await connection.execute('UPDATE users SET password = ? WHERE username = ?', [hash, 'admin']);
  
  console.log('Admin password updated in database.');
  await connection.end();
}

seedAdmin().catch(console.error);
