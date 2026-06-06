import { NextResponse } from 'next/server';
import { getUserFromToken, getUserById } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(Number(decoded.sub));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
