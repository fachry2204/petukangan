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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate dan endDate wajib diisi' }, { status: 400 });
    }

    // Query GPS tracking - coba dengan LEFT JOIN users
    let sql = `SELECT g.*, u.fullName, u.photoUrl 
               FROM gps_tracking g 
               LEFT JOIN users u ON u.id = g.userId 
               WHERE g.timestamp >= ? AND g.timestamp <= ?`;
    const params: any[] = [startDate, endDate + ' 23:59:59'];

    if (userId) {
      sql += ' AND g.userId = ?';
      params.push(Number(userId));
    }

    sql += ' ORDER BY g.timestamp ASC';

    const rows: any = await queryDb(sql, params);

    const points = (rows || []).map((r: any) => ({
      id: Number(r.id),
      userId: Number(r.userId),
      lat: Number(r.lat),
      lng: Number(r.lng),
      timestamp: r.timestamp,
      fullName: r.fullName || `Petugas ${r.userId}`,
      photoUrl: r.photoUrl,
      speed: Number(r.speed) || 0,
      batteryLevel: Number(r.batteryLevel) || 0,
      isMock: Boolean(r.isMock),
      ipAddress: r.ipAddress,
      wifiName: r.wifiName,
      provider: r.provider,
      statusAbsen: r.statusAbsen,
    }));

    return NextResponse.json({ startDate, endDate, count: points.length, points });
  } catch (err: any) {
    console.error('[GET /api/tracking/gps-history] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
