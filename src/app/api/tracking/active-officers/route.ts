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

    const { searchParams } = new URL(req.url);
    const minutes = Math.max(1, Math.min(Number(searchParams.get('minutes')) || 60, 240));

    const rows: any = await queryDb(
      `SELECT g.*, u.fullName, u.photoUrl
       FROM gps_tracking g
       INNER JOIN (
         SELECT userId, MAX(timestamp) AS maxTs
         FROM gps_tracking
         WHERE timestamp >= NOW() - INTERVAL ? MINUTE
         GROUP BY userId
       ) latest ON g.userId = latest.userId AND g.timestamp = latest.maxTs
       LEFT JOIN users u ON u.id = g.userId
       WHERE g.timestamp >= NOW() - INTERVAL ? MINUTE`,
      [minutes, minutes]
    );

    const officers = (rows || []).map((r: any) => ({
      userId: Number(r.userId),
      lat: Number(r.lat),
      lng: Number(r.lng),
      speed: Number(r.speed) || 0,
      batteryLevel: Number(r.batteryLevel) || 0,
      isMock: Boolean(r.isMock),
      ipAddress: r.ipAddress,
      wifiName: r.wifiName,
      provider: r.provider,
      statusAbsen: r.statusAbsen,
      timestamp: r.timestamp,
      fullName: r.fullName || `Petugas ${r.userId}`,
      photoUrl: r.photoUrl,
    }));

    return NextResponse.json({ count: officers.length, officers });
  } catch (err: any) {
    console.error('[GET /api/tracking/active-officers] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
