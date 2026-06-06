const mysql = require('mysql2/promise');

async function checkDb() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });

  try {
    console.log('=== STRUKTUR TABEL attendance ===');
    const [attendanceCols] = await conn.execute('DESCRIBE attendance');
    attendanceCols.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (NULL: ${col.Null}, Key: ${col.Key}, Default: ${col.Default}, Extra: ${col.Extra})`);
    });

    console.log('\n=== STRUKTUR TABEL lembur ===');
    const [lemburCols] = await conn.execute('DESCRIBE lembur');
    lemburCols.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (NULL: ${col.Null}, Key: ${col.Key}, Default: ${col.Default}, Extra: ${col.Extra})`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

checkDb();
