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
      `SELECT id, shiftName, timeRange, zone, DATE_FORMAT(date, '%Y-%m-%d') AS date, assignedUsers, status, createdAt, updatedAt FROM schedules ORDER BY date DESC, id DESC`
    );

    // Fetch all users once so we can enrich assignedUsers with photoUrl
    const allUsers: any = await queryDb(`SELECT id, username, fullName, photoUrl FROM users`);
    const userMap: Record<number, any> = {};
    for (const u of (allUsers || [])) {
      userMap[u.id] = u;
    }

    const parsedRows = (rows || []).map((row: any) => {
      let assignedUsers: any[] = [];
      if (row.assignedUsers) {
        if (typeof row.assignedUsers === 'string') {
          try {
            assignedUsers = JSON.parse(row.assignedUsers);
          } catch (e) {
            console.error('Failed to parse assignedUsers string:', e);
            assignedUsers = [];
          }
        } else if (Array.isArray(row.assignedUsers)) {
          assignedUsers = row.assignedUsers;
        }
      }

      // Enrich each user entry with current photoUrl from users table
      const enrichedUsers = assignedUsers.map((u: any) => {
        const fresh = userMap[u.id];
        return {
          id: u.id,
          username: u.username || fresh?.username || '',
          fullName: u.fullName || fresh?.fullName || '',
          photoUrl: fresh?.photoUrl || u.photoUrl || null,
        };
      });

      return {
        ...row,
        assignedUsers: enrichedUsers,
      };
    });

    return NextResponse.json(parsedRows);
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

    // Strip photoUrl before saving to keep the JSON payload small.
    const slimUsers = (data.assignedUsers || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
    }));

    await queryDb(
      `INSERT INTO schedules (shiftName, timeRange, zone, date, assignedUsers, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(6), NOW(6))`,
      [data.shiftName, data.timeRange, data.zone || null, data.date, JSON.stringify(slimUsers), data.status || 'Mendatang']
    );
    emitScheduleChange('create', data);
    return NextResponse.json({ message: 'Jadwal berhasil dibuat' }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/schedules] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
