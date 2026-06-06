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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const data = await req.json();

    await queryDb(
      `UPDATE schedules SET shiftName=?, timeRange=?, zone=?, date=?, assignedUsers=?, status=?, updatedAt=NOW(6) WHERE id=?`,
      [data.shiftName, data.timeRange, data.zone || null, data.date, JSON.stringify(data.assignedUsers || []), data.status || 'ACTIVE', Number(id)]
    );

    emitScheduleChange('update', { id: Number(id), ...data });
    return NextResponse.json({ message: 'Jadwal berhasil diperbarui' });
  } catch (err: any) {
    console.error('[PUT /api/schedules/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await queryDb('DELETE FROM schedules WHERE id = ?', [Number(id)]);
    emitScheduleChange('delete', { id: Number(id) });
    return NextResponse.json({ message: 'Jadwal berhasil dihapus' });
  } catch (err: any) {
    console.error('[DELETE /api/schedules/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
