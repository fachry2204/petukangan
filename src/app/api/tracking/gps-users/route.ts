import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';


export async function GET(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate dan endDate wajib diisi' }, { status: 400 });
    }

    const rows: any = await queryDb(
      `SELECT g.userId, MIN(u.fullName) as fullName
       FROM gps_tracking g
       LEFT JOIN users u ON u.id = g.userId
       WHERE g.timestamp >= ? AND g.timestamp <= ?
       GROUP BY g.userId`,
      [startDate, endDate + ' 23:59:59']
    );

    const users = (rows || []).map((r: any) => ({
      userId: Number(r.userId),
      fullName: r.fullName || `Petugas ${r.userId}`,
    }));

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error('[GET /api/tracking/gps-users] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
