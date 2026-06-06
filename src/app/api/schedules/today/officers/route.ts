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

    // Adjust to WIB (UTC+7) for correct "today" in Jakarta timezone
    const todayJakarta = new Date();
    todayJakarta.setMinutes(todayJakarta.getMinutes() + todayJakarta.getTimezoneOffset() + 420);
    todayJakarta.setHours(0, 0, 0, 0);
    const todayStr = todayJakarta.toISOString().split('T')[0];

    const rows: any = await queryDb(
      `SELECT * FROM schedules WHERE DATE(date) = ?`,
      [todayStr]
    );

    const officers: any[] = [];
    for (const s of rows || []) {
      let assignedUsers = s.assignedUsers;
      if (typeof assignedUsers === 'string') {
        try { assignedUsers = JSON.parse(assignedUsers); } catch { assignedUsers = []; }
      }
      if (Array.isArray(assignedUsers)) {
        for (const user of assignedUsers) {
          officers.push({
            userId: user.id,
            fullName: user.fullName || user.name || `Petugas ${user.id}`,
            photoUrl: user.photoUrl,
            scheduleTime: s.timeRange || '-',
          });
        }
      }
    }

    return NextResponse.json(officers);
  } catch (err: any) {
    console.error('[GET /api/schedules/today/officers] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
