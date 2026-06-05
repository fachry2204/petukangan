import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export async function GET(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Create table if not exists
    await queryDb(`
      CREATE TABLE IF NOT EXISTS gps_tracking (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        lat DECIMAL(10,8) NOT NULL,
        lng DECIMAL(11,8) NOT NULL,
        speed DECIMAL(5,2) DEFAULT NULL,
        batteryLevel INT DEFAULT NULL,
        isMock TINYINT(1) DEFAULT 0,
        ipAddress VARCHAR(45) DEFAULT NULL,
        wifiName VARCHAR(100) DEFAULT NULL,
        provider VARCHAR(50) DEFAULT NULL,
        statusAbsen VARCHAR(30) DEFAULT NULL,
        timestamp DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_userId (userId),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Check existing columns
    const columns: any = await queryDb('SHOW COLUMNS FROM gps_tracking');
    const colNames = columns.map((c: any) => c.Field);
    
    // Get some PPSU users
    const users: any = await queryDb(`SELECT id FROM users WHERE roleId = 2 LIMIT 5`);
    
    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No PPSU users found to seed' });
    }

    // Insert dummy GPS data for testing
    const baseLat = -6.2088; // Jakarta
    const baseLng = 106.8456;

    for (const user of users) {
      const randomOffset = () => (Math.random() - 0.5) * 0.02;
      const hasProvider = colNames.includes('provider');
      const hasStatusAbsen = colNames.includes('statusAbsen');
      
      if (hasProvider && hasStatusAbsen) {
        await queryDb(
          `INSERT INTO gps_tracking (userId, lat, lng, speed, batteryLevel, isMock, provider, statusAbsen, timestamp)
           VALUES (?, ?, ?, ?, ?, 0, 'GPS', 'Sudah Absen', DATE_SUB(NOW(6), INTERVAL ? MINUTE))`,
          [user.id, baseLat + randomOffset(), baseLng + randomOffset(), Math.floor(Math.random() * 30), Math.floor(Math.random() * 40) + 60, Math.floor(Math.random() * 60)]
        );
      } else {
        await queryDb(
          `INSERT INTO gps_tracking (userId, lat, lng, speed, batteryLevel, isMock, timestamp)
           VALUES (?, ?, ?, ?, ?, 0, DATE_SUB(NOW(6), INTERVAL ? MINUTE))`,
          [user.id, baseLat + randomOffset(), baseLng + randomOffset(), Math.floor(Math.random() * 30), Math.floor(Math.random() * 40) + 60, Math.floor(Math.random() * 60)]
        );
      }
    }

    return NextResponse.json({ 
      message: 'GPS tracking table created and seeded with dummy data',
      seededUsers: users.length,
      columns: colNames
    });
  } catch (err: any) {
    console.error('[GET /api/tracking/seed] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
