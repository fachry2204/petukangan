import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';


export async function GET(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

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
