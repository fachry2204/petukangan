import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
}

function getTodayInWib() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function GET(req: Request) {
  try {
    if (!getUserFromToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = getTodayInWib();
    const schedules = await queryDb(
      'SELECT assignedUsers FROM schedules WHERE DATE(date) = ?',
      [today]
    ) as Array<{ assignedUsers: string | Array<{ id?: number | string; userId?: number | string }> | null }>;

    const scheduledIds = new Set<number>();
    for (const schedule of schedules) {
      let assignedUsers = schedule.assignedUsers;
      if (typeof assignedUsers === 'string') {
        try { assignedUsers = JSON.parse(assignedUsers); } catch { assignedUsers = []; }
      }
      if (!Array.isArray(assignedUsers)) continue;
      for (const user of assignedUsers) {
        const id = Number(user.id ?? user.userId);
        if (Number.isFinite(id) && id > 0) scheduledIds.add(id);
      }
    }

    const piketIds = [...scheduledIds];
    if (piketIds.length === 0) {
      return NextResponse.json({ petugasPiket: 0, sudahAbsen: 0, belumAbsen: 0, izinTidakMasuk: 0, date: today });
    }

    const placeholders = piketIds.map(() => '?').join(',');
    const records = await queryDb(
      `SELECT userId, type, status FROM attendance
       WHERE userId IN (${placeholders}) AND DATE(timestamp) = ?
         AND type IN ('IN', 'PERMIT')`,
      [...piketIds, today]
    ) as Array<{ userId: number; type: string; status: string }>;

    const presentIds = new Set(
      records
        .filter((record) => record.type === 'IN' && !['PENDING', 'REJECTED'].includes(record.status))
        .map((record) => Number(record.userId))
    );
    const permitIds = new Set(
      records
        .filter((record) => record.type === 'PERMIT' && record.status === 'APPROVED')
        .map((record) => Number(record.userId))
    );
    const belumAbsen = piketIds.filter((id) => !presentIds.has(id) && !permitIds.has(id)).length;

    return NextResponse.json({
      petugasPiket: piketIds.length,
      sudahAbsen: presentIds.size,
      belumAbsen,
      izinTidakMasuk: permitIds.size,
      date: today,
    });
  } catch (err: any) {
    console.error('[GET /api/dashboard/attendance-stats] error:', err);
    return NextResponse.json({ error: 'Gagal memuat statistik kehadiran hari ini.' }, { status: 500 });
  }
}
