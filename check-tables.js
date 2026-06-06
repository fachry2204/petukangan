const mysql = require('mysql2/promise');

async function checkTables() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });

  try {
    // Check attendance
    console.log('=== attendance table ===');
    const [attCols] = await conn.execute('DESCRIBE attendance');
    attCols.forEach(col => console.log(col));

    // Check lembur
    console.log('\n=== lembur table ===');
    const [lemCols] = await conn.execute('DESCRIBE lembur');
    lemCols.forEach(col => console.log(col));

    // Check attendance_requests
    console.log('\n=== attendance_requests table ===');
    const [reqCols] = await conn.execute('DESCRIBE attendance_requests');
    reqCols.forEach(col => console.log(col));

    // Last 5 attendance records
    console.log('\n=== Last 5 attendance records ===');
    const [attRows] = await conn.execute('SELECT * FROM attendance ORDER BY id DESC LIMIT 5');
    attRows.forEach(row => console.log(row));

    console.log('\n=== Last 5 attendance_requests records ===');
    const [reqRows] = await conn.execute('SELECT * FROM attendance_requests ORDER BY id DESC LIMIT 5');
    reqRows.forEach(row => console.log(row));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

checkTables();
