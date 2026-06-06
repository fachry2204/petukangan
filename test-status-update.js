const mysql = require('mysql2/promise');

async function testUpdate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });

  try {
    // Get an existing PERMIT record
    const [rows] = await conn.execute('SELECT id, status FROM attendance WHERE type = ? ORDER BY id DESC LIMIT 1', ['PERMIT']);
    if (!rows.length) {
      console.log('No PERMIT records found!');
      return;
    }
    const recordId = rows[0].id;
    console.log('Found record with ID:', recordId, 'Current status:', rows[0].status);

    // Test update to APPROVED
    const [result] = await conn.execute(
      'UPDATE attendance SET status = ?, rejectionReason = ? WHERE id = ?',
      ['APPROVED', null, recordId]
    );
    console.log('Update result:', result);

    // Verify change
    const [updated] = await conn.execute('SELECT id, status FROM attendance WHERE id = ?', [recordId]);
    console.log('Updated record:', updated[0]);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

testUpdate();
