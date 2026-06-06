import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';
import { emitAttendanceChange } from '@/lib/socket-emit';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { status, rejectionReason, isRequestTable } = body;

    if (isRequestTable) {
      await queryDb(
        `UPDATE attendance_requests SET status = ?, rejectionReason = ? WHERE id = ?`,
        [status, rejectionReason || null, id]
      );
      return NextResponse.json({ message: 'Status permintaan absen diupdate' });
    }

    // Try attendance first, then lembur
    let updated = false;
    const [attRows]: any = await queryDb(`SELECT id FROM attendance WHERE id = ?`, [id]);
    if (attRows?.[0]) {
      await queryDb(
        `UPDATE attendance SET status = ?, rejectionReason = ? WHERE id = ?`,
        [status, rejectionReason || null, id]
      );
      updated = true;
    } else {
      const [lemRows]: any = await queryDb(`SELECT id FROM lembur WHERE id = ?`, [id]);
      if (lemRows?.[0]) {
        await queryDb(
          `UPDATE lembur SET status = ?, rejectionReason = ? WHERE id = ?`,
          [status, rejectionReason || null, id]
        );
        updated = true;
      }
    }

    if (!updated) {
      return NextResponse.json({ error: 'Data absensi tidak ditemukan' }, { status: 404 });
    }

    emitAttendanceChange('update', { id: Number(id), status, isRequestTable });
    return NextResponse.json({ message: 'Status absensi diupdate' });
  } catch (err: any) {
    console.error('[PUT /api/attendance/record/:id/status] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
