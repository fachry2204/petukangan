const mysql = require('mysql2/promise');

async function testSchedulesDirectly() {
  let connection;
  try {
    console.log('1. Connecting to MySQL database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'ppsu_monitoring'
    });
    console.log('Successfully connected to MySQL database: ppsu_monitoring');

    console.log('\n2. Verifying if schedules table exists...');
    const [tables] = await connection.query("SHOW TABLES LIKE 'schedules'");
    if (tables.length > 0) {
      console.log('Table "schedules" exists!');
    } else {
      console.error('Table "schedules" does NOT exist yet! Running TypeORM sync should create it.');
      return;
    }

    console.log('\n3. Inserting a test schedule directly...');
    const testAssignedUsers = JSON.stringify([
      { id: 2, username: 'PPSU001', fullName: 'Budi Santoso', photoUrl: '' },
      { id: 3, username: 'PPSU002', fullName: 'Siti Rahma', photoUrl: '' }
    ]);
    
    const [insertResult] = await connection.query(
      "INSERT INTO schedules (shiftName, timeRange, zone, date, assignedUsers, status) VALUES (?, ?, ?, ?, ?, ?)",
      ['Shift Pagi', '08:00 - 16:00', 'Zona A', '2026-05-17', testAssignedUsers, 'Berjalan']
    );
    console.log('Successfully inserted test schedule. Insert ID:', insertResult.insertId);

    console.log('\n4. Retrieving inserted schedule from database...');
    const [rows] = await connection.query("SELECT * FROM schedules WHERE id = ?", [insertResult.insertId]);
    console.log('Retrieved record from MySQL:', rows[0]);
    console.log('Assigned Users parsed:', JSON.parse(rows[0].assignedUsers));

    console.log('\n5. Cleaning up test schedule...');
    await connection.query("DELETE FROM schedules WHERE id = ?", [insertResult.insertId]);
    console.log('Test schedule deleted successfully!');

  } catch (error) {
    console.error('Error during direct MySQL schedules test:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

testSchedulesDirectly();
