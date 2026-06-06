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

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tasks: any = await queryDb(
      `SELECT t.*, z.name as zoneName, u.fullName as assignedToName FROM tasks t LEFT JOIN zones z ON z.id = t.zoneId LEFT JOIN users u ON u.id = t.assignedToId WHERE t.id = ?`,
      [id]
    );
    if (!tasks?.[0]) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    const logs: any = await queryDb(
      `SELECT * FROM task_logs WHERE taskId = ? ORDER BY createdAt DESC`,
      [id]
    );

    return NextResponse.json({ ...tasks[0], logs: logs || [] });
  } catch (err: any) {
    console.error('[GET /api/tasks/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
    if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }
    if (body.priority !== undefined) { updates.push('priority = ?'); values.push(body.priority); }
    if (body.taskType !== undefined) { updates.push('taskType = ?'); values.push(body.taskType); }
    if (body.lat !== undefined) { updates.push('lat = ?'); values.push(body.lat); }
    if (body.lng !== undefined) { updates.push('lng = ?'); values.push(body.lng); }
    if (body.address !== undefined) { updates.push('address = ?'); values.push(body.address); }
    if (body.deadline !== undefined) { updates.push('deadline = ?'); values.push(body.deadline || null); }
    if (body.assignedToId !== undefined) { updates.push('assignedToId = ?'); values.push(body.assignedToId || null); }
    if (body.zoneId !== undefined) { updates.push('zoneId = ?'); values.push(body.zoneId || null); }
    if (body.rejectionReason !== undefined) { updates.push('rejectionReason = ?'); values.push(body.rejectionReason); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diupdate' }, { status: 400 });
    }

    values.push(id);
    await queryDb(`UPDATE tasks SET ${updates.join(', ')}, updatedAt = NOW(6) WHERE id = ?`, values);

    // If rejectionReason provided, create log
    if (body.rejectionReason) {
      await queryDb(
        `INSERT INTO task_logs (taskId, status, lat, lng, address, photoUrl, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(6))`,
        [id, body.status || 'TODO', body.lat || null, body.lng || null, body.address || null, body.photoUrl || null, `Ditolak admin: ${body.rejectionReason}`]
      );
    }

    emitTaskChange('update', { id: Number(id), ...body });
    return NextResponse.json({ message: 'Tugas berhasil diupdate' });
  } catch (err: any) {
    console.error('[PUT /api/tasks/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await queryDb('DELETE FROM task_logs WHERE taskId = ?', [id]);
    await queryDb('DELETE FROM tasks WHERE id = ?', [id]);
    emitTaskChange('delete', { id: Number(id) });
    return NextResponse.json({ id: Number(id), deleted: true });
  } catch (err: any) {
    console.error('[DELETE /api/tasks/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
