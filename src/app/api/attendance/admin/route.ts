import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';


export async function GET(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const regular: any = await queryDb(
      `SELECT a.*, u.fullName as userName, u.photoUrl as userPhoto FROM attendance a JOIN users u ON u.id = a.userId ORDER BY a.timestamp DESC`
    );

    const lembur: any = await queryDb(
      `SELECT l.*, u.fullName as userName, u.photoUrl as userPhoto FROM lembur l JOIN users u ON u.id = l.userId ORDER BY l.timestamp DESC`
    );

    const requests: any = await queryDb(
      `SELECT r.*, u.fullName as userName, u.photoUrl as userPhoto FROM attendance_requests r JOIN users u ON u.id = r.userId ORDER BY r.timestamp DESC`
    );

    const mappedRequests = (requests || []).map((req: any) => ({
      id: req.id,
      userId: req.userId,
      userName: req.userName,
      type: 'IN',
      timestamp: req.timestamp,
      lat: req.lat,
      lng: req.lng,
      address: req.address,
      photoUrl: null,
      reason: req.reason,
      deviceInfo: null,
      isMock: false,
      status: req.status,
      isOutsideSchedule: true,
      rejectionReason: req.rejectionReason,
      isRequestTable: true,
    }));

    const recordsMapped = (regular || []).map((r: any) => ({ ...r, isLembur: false }));
    const lemburMapped = (lembur || []).map((l: any) => ({ ...l, isLembur: true }));

    const merged = [...recordsMapped, ...lemburMapped, ...mappedRequests];
    merged.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(merged);
  } catch (err: any) {
    console.error('[GET /api/attendance/admin] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
