import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export async function POST(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const userId = decoded.sub;

    // Ensure gps_tracking table exists
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

    await queryDb(
      `INSERT INTO gps_tracking (userId, lat, lng, speed, batteryLevel, isMock, ipAddress, wifiName, provider, statusAbsen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.lat,
        data.lng,
        data.speed || null,
        data.batteryLevel || null,
        data.isMock ? 1 : 0,
        data.ipAddress || null,
        data.wifiName || null,
        data.provider || null,
        data.statusAbsen || null,
      ]
    );

    return NextResponse.json({ message: 'Location saved' });
  } catch (err: any) {
    console.error('[POST /api/tracking/location] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
