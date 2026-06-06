const mysql = require('mysql2/promise');

async function checkDb() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });

  try {
    console.log('=== Struktur Tabel attendance ===');
    const [attendanceCols] = await conn.execute('DESCRIBE attendance');
    console.table(attendanceCols);

    console.log('\n=== Struktur Tabel lembur ===');
    const [lemburCols] = await conn.execute('DESCRIBE lembur');
    console.table(lemburCols);

    console.log('\n=== Data Terbaru di attendance ===');
    const [attendanceData] = await conn.execute('SELECT * FROM attendance ORDER BY id DESC LIMIT 5');
    console.table(attendanceData);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

checkDb();
