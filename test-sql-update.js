const mysql = require('mysql2/promise');

async function testUpdate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });

  try {
    // First get the last permit record's id
    const [rows] = await conn.execute('SELECT id, status FROM attendance WHERE type = ? ORDER BY id DESC LIMIT 1', ['PERMIT']);
    if (rows.length === 0) {
      console.log('No permit records found!');
      return;
    }
    const recordId = rows[0].id;
    console.log('Found record with id:', recordId, 'current status:', rows[0].status);

    // Try to update
    const [updateRes] = await conn.execute(
      'UPDATE attendance SET status = ?, rejectionReason = ? WHERE id = ?',
      ['APPROVED', null, recordId]
    );
    console.log('Update result:', updateRes);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

testUpdate();
