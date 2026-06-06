import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';

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

    const regular: any = await queryDb(
      `SELECT a.*, u.id as userId, u.fullName, u.username, u.photoUrl FROM attendance a JOIN users u ON u.id = a.userId ORDER BY a.timestamp DESC`
    );

    const lembur: any = await queryDb(
      `SELECT l.*, u.id as userId, u.fullName, u.username, u.photoUrl FROM lembur l JOIN users u ON u.id = l.userId ORDER BY l.timestamp DESC`
    );

    const requests: any = await queryDb(
      `SELECT r.*, u.id as userId, u.fullName, u.username, u.photoUrl FROM attendance_requests r JOIN users u ON u.id = r.userId ORDER BY r.timestamp DESC`
    );

    const mappedRequests = (requests || []).map((req: any) => ({
      id: req.id,
      userId: req.userId,
      user: {
        id: req.userId,
        fullName: req.fullName,
        username: req.username,
        photoUrl: req.photoUrl
      },
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

    const recordsMapped = (regular || []).map((r: any) => ({ 
      ...r, 
      isLembur: false,
      user: {
        id: r.userId,
        fullName: r.fullName,
        username: r.username,
        photoUrl: r.photoUrl
      }
    }));
    const lemburMapped = (lembur || []).map((l: any) => ({ 
      ...l, 
      isLembur: true,
      user: {
        id: l.userId,
        fullName: l.fullName,
        username: l.username,
        photoUrl: l.photoUrl
      }
    }));

    const merged = [...recordsMapped, ...lemburMapped, ...mappedRequests];
    merged.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(merged);
  } catch (err: any) {
    console.error('[GET /api/attendance/admin] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
