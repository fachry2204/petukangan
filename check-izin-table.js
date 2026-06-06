const mysql = require('mysql2/promise');

async function checkDb() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });

  try {
    console.log('=== STRUKTUR TABEL izin_petugas ===');
    const [cols] = await conn.execute('DESCRIBE izin_petugas');
    cols.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (NULL: ${col.Null}, Key: ${col.Key}, Default: ${col.Default}, Extra: ${col.Extra})`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

checkDb();
