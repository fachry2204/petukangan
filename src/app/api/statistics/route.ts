import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';

type AssignedUser = { id?: number | string; userId?: number | string };
type Officer = { id: number; username: string; fullName: string; photoUrl?: string | null; status: string };

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
}

function dateKey(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function parseAssignedUsers(value: unknown): AssignedUser[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function validDate(value: string | null, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export async function GET(req: Request) {
  try {
    if (!getUserFromToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const monthStart = `${today.slice(0, 7)}-01`;
    const from = validDate(url.searchParams.get('from'), monthStart);
    const to = validDate(url.searchParams.get('to'), today);
    const shift = String(url.searchParams.get('shift') || '').trim();
    const zone = String(url.searchParams.get('zone') || '').trim();

    const officers = await queryDb(
      `SELECT u.id, u.username, u.fullName, u.photoUrl, u.status
       FROM users u LEFT JOIN roles r ON r.id = u.roleId
       WHERE r.name = 'PJLP' OR r.name IS NULL
       ORDER BY u.fullName ASC`,
    ) as Officer[];

    const scheduleConditions = ['date BETWEEN ? AND ?'];
    const scheduleParams: unknown[] = [from, to];
    if (shift) { scheduleConditions.push('shiftName = ?'); scheduleParams.push(shift); }
    if (zone) { scheduleConditions.push('zone = ?'); scheduleParams.push(zone); }

    const [schedules, attendance, tasks, filterRows] = await Promise.all([
      queryDb(
        `SELECT id, shiftName, zone, DATE_FORMAT(date, '%Y-%m-%d') AS date, assignedUsers
         FROM schedules WHERE ${scheduleConditions.join(' AND ')} ORDER BY date ASC`,
        scheduleParams,
      ) as Promise<Array<{ id: number; shiftName: string; zone: string; date: string; assignedUsers: unknown }>>,
      queryDb(
        `SELECT userId, type, status, DATE_FORMAT(timestamp, '%Y-%m-%d') AS date
         FROM attendance
         WHERE timestamp >= ? AND timestamp < DATE_ADD(?, INTERVAL 1 DAY)
           AND type IN ('IN', 'PERMIT')`,
        [from, to],
      ) as Promise<Array<{ userId: number; type: string; status: string; date: string }>>,
      queryDb(
        `SELECT t.assignedToId AS userId, t.status, t.zoneId, DATE_FORMAT(t.createdAt, '%Y-%m-%d') AS date
         FROM tasks t LEFT JOIN zones z ON z.id = t.zoneId
         WHERE t.createdAt >= ? AND t.createdAt < DATE_ADD(?, INTERVAL 1 DAY)
           ${zone ? 'AND z.name = ?' : ''}`,
        zone ? [from, to, zone] : [from, to],
      ) as Promise<Array<{ userId: number | null; status: string; zoneId: number | null; date: string }>>,
      queryDb('SELECT DISTINCT shiftName, zone FROM schedules ORDER BY shiftName, zone') as Promise<Array<{ shiftName: string; zone: string }>>,
    ]);

    const officerMap = new Map(officers.map((officer) => [Number(officer.id), officer]));
    const scheduledByDate = new Map<string, Set<number>>();
    const scheduledCount = new Map<number, number>();

    for (const schedule of schedules) {
      const key = dateKey(schedule.date) || String(schedule.date).slice(0, 10);
      if (!scheduledByDate.has(key)) scheduledByDate.set(key, new Set());
      for (const assigned of parseAssignedUsers(schedule.assignedUsers)) {
        const id = Number(assigned.id ?? assigned.userId);
        if (!Number.isFinite(id) || !officerMap.has(id)) continue;
        scheduledByDate.get(key)?.add(id);
        scheduledCount.set(id, (scheduledCount.get(id) || 0) + 1);
      }
    }

    const presentByDate = new Map<string, Set<number>>();
    const permitByDate = new Map<string, Set<number>>();
    for (const row of attendance) {
      const key = dateKey(row.date) || String(row.date).slice(0, 10);
      const target = row.type === 'PERMIT' && row.status === 'APPROVED'
        ? permitByDate
        : row.type === 'IN' && !['PENDING', 'REJECTED'].includes(row.status)
          ? presentByDate
          : null;
      if (!target) continue;
      if (!target.has(key)) target.set(key, new Set());
      target.get(key)?.add(Number(row.userId));
    }

    const trend = [...scheduledByDate.keys()].sort().map((date) => {
      const scheduled = scheduledByDate.get(date) || new Set<number>();
      const present = presentByDate.get(date) || new Set<number>();
      const permits = permitByDate.get(date) || new Set<number>();
      const hadir = [...scheduled].filter((id) => present.has(id)).length;
      const izin = [...scheduled].filter((id) => !present.has(id) && permits.has(id)).length;
      const tidakHadir = [...scheduled].filter((id) => !present.has(id) && !permits.has(id)).length;
      return { date, hadir, izin, tidakHadir, scheduled: scheduled.size };
    });

    const absences = new Map<number, number>();
    for (const [date, scheduled] of scheduledByDate) {
      const present = presentByDate.get(date) || new Set<number>();
      const permits = permitByDate.get(date) || new Set<number>();
      for (const id of scheduled) {
        if (!present.has(id) && !permits.has(id)) absences.set(id, (absences.get(id) || 0) + 1);
      }
    }

    const taskCounts = new Map<number, { total: number; completed: number }>();
    for (const officer of officers) taskCounts.set(Number(officer.id), { total: 0, completed: 0 });
    for (const task of tasks) {
      const id = Number(task.userId);
      if (!Number.isFinite(id) || !taskCounts.has(id)) continue;
      const current = taskCounts.get(id)!;
      current.total += 1;
      if (String(task.status).toUpperCase() === 'DONE') current.completed += 1;
    }

    const rankingRow = (officer: Officer, value: number, secondary?: number) => ({
      id: officer.id,
      username: officer.username,
      fullName: officer.fullName,
      photoUrl: officer.photoUrl || null,
      value,
      secondary: secondary ?? value,
    });
    const activeOfficers = officers.filter((officer) => String(officer.status).toUpperCase() === 'ACTIVE');
    const mostAbsent = activeOfficers
      .map((officer) => rankingRow(officer, absences.get(Number(officer.id)) || 0, scheduledCount.get(Number(officer.id)) || 0))
      .sort((a, b) => b.value - a.value || b.secondary - a.secondary)
      .slice(0, 5);
    const taskRanking = activeOfficers.map((officer) => {
      const count = taskCounts.get(Number(officer.id)) || { total: 0, completed: 0 };
      return rankingRow(officer, count.completed, count.total);
    });
    const mostTasks = [...taskRanking].sort((a, b) => b.value - a.value || b.secondary - a.secondary).slice(0, 5);
    const leastTasks = [...taskRanking].sort((a, b) => a.value - b.value || a.secondary - b.secondary).slice(0, 5);

    const scheduledTotal = trend.reduce((sum, row) => sum + row.scheduled, 0);
    const presentTotal = trend.reduce((sum, row) => sum + row.hadir, 0);
    const permitTotal = trend.reduce((sum, row) => sum + row.izin, 0);
    const absentTotal = trend.reduce((sum, row) => sum + row.tidakHadir, 0);
    const completedTasks = tasks.filter((task) => String(task.status).toUpperCase() === 'DONE').length;
    const officersWithTasks = taskRanking.filter((row) => row.secondary > 0).length;

    return NextResponse.json({
      period: { from, to },
      summary: {
        attendanceRate: scheduledTotal ? Math.round((presentTotal / scheduledTotal) * 100) : 0,
        scheduledTotal,
        presentTotal,
        permitTotal,
        absentTotal,
        completedTasks,
        averageTasks: officersWithTasks ? Number((tasks.length / officersWithTasks).toFixed(1)) : 0,
        attentionOfficers: mostAbsent.filter((row) => row.value > 0).length,
        totalTasks: tasks.length,
      },
      trend,
      rankings: { mostAbsent, mostTasks, leastTasks },
      filters: {
        shifts: [...new Set(filterRows.map((row) => row.shiftName).filter(Boolean))],
        zones: [...new Set(filterRows.map((row) => row.zone).filter(Boolean))],
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/statistics] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gagal memuat statistik.' }, { status: 500 });
  }
}
