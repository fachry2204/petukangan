import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';


export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
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

    return NextResponse.json({ message: 'Status absensi diupdate' });
  } catch (err: any) {
    console.error('[PUT /api/attendance/record/:id/status] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
