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

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await req.json();
    const { status, lat, lng, address, photo, note } = data;
    const userId = decoded.sub;

    const conn = await getDbConnection();
    try {
      // Verify task exists and belongs to user
      const [tasks]: any = await conn.execute(
        `SELECT * FROM tasks WHERE id = ?`,
        [id]
      );
      if (!tasks?.[0]) {
        return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });
      }
      const task = tasks[0];
      if (task.assignedToId !== userId) {
        return NextResponse.json({ error: 'Tugas ini tidak ditugaskan kepada Anda' }, { status: 400 });
      }

      // Validate allowed transitions
      const currentStatus = task.status;
      const allowedTransitions: Record<string, string[]> = {
        TASK_NEW: ['TASK_ACCEPTED'],
        TASK_ACCEPTED: ['ARRIVED'],
        ARRIVED: ['NOT_STARTED'],
        NOT_STARTED: ['WORKING'],
        WORKING: ['VERIFY'],
        VERIFY: ['DONE'],
      };
      if (allowedTransitions[currentStatus] && !allowedTransitions[currentStatus].includes(status)) {
        return NextResponse.json({ error: `Transisi dari ${currentStatus} ke ${status} tidak diperbolehkan` }, { status: 400 });
      }

      // Require photo for certain statuses
      const requiresPhoto = ['ARRIVED', 'NOT_STARTED', 'WORKING', 'VERIFY'];
      let photoUrl = photo || null;
      if (requiresPhoto.includes(status) && !photoUrl) {
        return NextResponse.json({ error: 'Foto wajib disertakan untuk perubahan status ini' }, { status: 400 });
      }

      // Create log
      await conn.execute(
        `INSERT INTO task_logs (taskId, status, lat, lng, address, photoUrl, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(6))`,
        [id, status, lat || null, lng || null, address || null, photoUrl, note || null]
      );

      // Update task status
      await conn.execute(
        `UPDATE tasks SET status = ?, updatedAt = NOW(6) WHERE id = ?`,
        [status, id]
      );

      emitTaskChange('update', { id: Number(id), status });
      return NextResponse.json({ message: 'Status tugas berhasil diupdate', status });
    } finally {
      await conn.end();
    }
  } catch (err: any) {
    console.error('[POST /api/tasks/:id/status] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
