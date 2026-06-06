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

const reverseCache = new Map<string, string>();

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cached = reverseCache.get(key);
  if (cached) return cached;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
          'User-Agent': 'sipetut-petukangan/1.0',
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data: any = await res.json();
    const display = data?.display_name ? String(data.display_name) : null;
    if (display) reverseCache.set(key, display);
    return display;
  } catch {
    return null;
  }
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tasks: any = await queryDb(
      `SELECT t.*, z.name as zoneName, u.fullName as assignedToName, u.photoUrl as assignedToPhotoUrl FROM tasks t LEFT JOIN zones z ON z.id = t.zoneId LEFT JOIN users u ON u.id = t.assignedToId WHERE t.id = ?`,
      [id]
    );
    if (!tasks?.[0]) return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 });

    const logs: any = await queryDb(
      `SELECT * FROM task_logs WHERE taskId = ? ORDER BY createdAt DESC`,
      [id]
    );

    const t = tasks[0];
    const resolvedLogs: any[] = [];
    for (const log of (logs || [])) {
      const addressStr = typeof log?.address === 'string' ? String(log.address).trim() : '';
      const isBadAddress = !addressStr || /^lokasi:/i.test(addressStr) || /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(addressStr);
      const latNum = log?.lat != null && log.lat !== '' ? Number(log.lat) : null;
      const lngNum = log?.lng != null && log.lng !== '' ? Number(log.lng) : null;

      if (isBadAddress && latNum != null && lngNum != null && Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        const resolved = await reverseGeocode(latNum, lngNum);
        resolvedLogs.push({ ...log, address: resolved || null, _addressResolved: Boolean(resolved) });
        continue;
      }
      resolvedLogs.push({ ...log, address: addressStr || null });
    }

    return NextResponse.json({
      ...t,
      assignedTo: t.assignedToId ? {
        id: t.assignedToId,
        fullName: t.assignedToName || null,
        photoUrl: t.assignedToPhotoUrl || null
      } : null,
      logs: resolvedLogs
    });
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

    try {
      await queryDb('ALTER TABLE tasks ADD COLUMN rejectionReason TEXT NULL');
    } catch {}

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
