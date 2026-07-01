import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb, getDbConnection } from '@/lib/db';
import { emitTaskChange } from '@/lib/socket-emit';

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

    const userId = decoded.role === 'PJLP' ? decoded.sub : undefined;
    let sql = `
      SELECT t.*, 
             z.name as zoneName, 
             u.fullName as assignedToName, 
             u.photoUrl as assignedToPhotoUrl,
             u.username as assignedToUsername,
             COALESCE((SELECT photoUrl FROM task_logs WHERE taskId = t.id AND status IN ('NOT_STARTED', 'TASK_ACCEPTED', 'ARRIVED') AND photoUrl IS NOT NULL ORDER BY createdAt DESC LIMIT 1), t.photoUrl) as photo_before,
             (SELECT photoUrl FROM task_logs WHERE taskId = t.id AND status = 'WORKING' AND photoUrl IS NOT NULL ORDER BY createdAt DESC LIMIT 1) as photo_during,
             (SELECT photoUrl FROM task_logs WHERE taskId = t.id AND status = 'DONE' AND photoUrl IS NOT NULL ORDER BY createdAt DESC LIMIT 1) as photo_after,
             (SELECT lat FROM task_logs WHERE taskId = t.id AND lat IS NOT NULL ORDER BY createdAt DESC LIMIT 1) as lat_done,
             (SELECT lng FROM task_logs WHERE taskId = t.id AND lng IS NOT NULL ORDER BY createdAt DESC LIMIT 1) as lng_done,
             (SELECT address FROM task_logs WHERE taskId = t.id AND address IS NOT NULL AND address NOT LIKE 'Lokasi Petugas%' ORDER BY createdAt DESC LIMIT 1) as address_done
      FROM tasks t 
      LEFT JOIN zones z ON z.id = t.zoneId 
      LEFT JOIN users u ON u.id = t.assignedToId`;
    const params: any[] = [];

    if (userId) {
      sql += ' WHERE t.assignedToId = ?';
      params.push(userId);
    }

    sql += ' ORDER BY t.createdAt DESC';
    const rows: any = await queryDb(sql, params);
    const mapped = (rows || []).map((r: any) => ({
      ...r,
      assignedTo: r.assignedToId ? {
        id: r.assignedToId,
        username: r.assignedToUsername || null,
        fullName: r.assignedToName || null,
        photoUrl: r.assignedToPhotoUrl || null
      } : null,
    }));
    return NextResponse.json(mapped);
  } catch (err: any) {
    console.error('[GET /api/tasks] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const { title, description, lat, lng, deadline, priority, officerIds, assignedToId, zoneId, address, photoUrl, taskType } = data;

    if (!title) {
      return NextResponse.json({ error: 'Judul tugas wajib diisi' }, { status: 400 });
    }

    const isAssigned = taskType === 'ASSIGNED' || assignedToId != null || (officerIds && officerIds.length > 0);
    const ids = isAssigned ? (officerIds || [assignedToId]).map((id: any) => Number(id)) : [decoded.sub];

    const conn = await getDbConnection();
    const createdTasks: any[] = [];

    try {
      for (const officerId of ids) {
        const [result]: any = await conn.execute(
          `INSERT INTO tasks (title, description, lat, lng, assignedToId, zoneId, status, priority, taskType, deadline, photoUrl, address, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))`,
          [
            title,
            description || '',
            lat || null,
            lng || null,
            officerId || null,
            zoneId || null,
            isAssigned ? 'TASK_NEW' : 'NOT_STARTED',
            priority || 'MEDIUM',
            isAssigned ? 'ASSIGNED' : (taskType || 'SELF'),
            deadline || null,
            photoUrl || null,
            address || null,
          ]
        );
        const task = { id: result.insertId, title, status: isAssigned ? 'TASK_NEW' : 'NOT_STARTED' };
        createdTasks.push(task);
        emitTaskChange('create', task);
      }
    } finally {
      await conn.end();
    }

    return NextResponse.json(createdTasks.length === 1 ? createdTasks[0] : createdTasks, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/tasks] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
