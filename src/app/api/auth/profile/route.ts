import { NextResponse } from 'next/server';
import { verifyToken, getUserById, getAdminById } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String((decoded as any).role || '');
    const adminRoles = ['ADMIN', 'STAFF', 'PIMPINAN'];
    if (adminRoles.includes(role)) {
      const admin = await getAdminById(Number(decoded.sub));
      if (!admin) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({
        id: admin.id,
        username: admin.username,
        fullName: admin.fullName,
        role: { name: admin.roleName, id: null },
        photoUrl: null,
        phone: admin.phone,
        email: admin.email,
        status: admin.status,
      });
    }

    const user = await getUserById(Number(decoded.sub));
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: { name: user.roleName, id: user.roleId },
      photoUrl: user.photoUrl,
      phone: user.phone,
      zone: user.zoneId,
      gender: user.gender,
      birthDate: user.birthDate,
      address: user.address,
      country: user.country,
      province: user.province,
      city: user.city,
      district: user.district,
      village: user.village,
      postalCode: user.postalCode,
      joinDate: user.joinDate,
      status: user.status,
    });
  } catch (err: any) {
    console.error('[GET /api/auth/profile] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
