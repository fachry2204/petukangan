import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';
import { emitScheduleChange } from '@/lib/socket-emit';

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

    const rows: any = await queryDb(
      `SELECT * FROM schedules ORDER BY date DESC, id DESC`
    );
    return NextResponse.json(rows || []);
  } catch (err: any) {
    console.error('[GET /api/schedules] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    await queryDb(
      `INSERT INTO schedules (shiftName, timeRange, zone, date, assignedUsers, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(6), NOW(6))`,
      [data.shiftName, data.timeRange, data.zone || null, data.date, JSON.stringify(data.assignedUsers || []), data.status || 'ACTIVE']
    );
    emitScheduleChange('create', data);
    return NextResponse.json({ message: 'Jadwal berhasil dibuat' }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/schedules] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
