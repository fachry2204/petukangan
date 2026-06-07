import { NextResponse } from 'next/server';
import { signToken, comparePassword, getUserByUsername } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const token = signToken({
      username: user.username,
      sub: user.id,
      role: user.roleName,
    });

    return NextResponse.json({
      access_token: token,
      user: {
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
      },
    });
  } catch (err: any) {
    console.error('[POST /api/auth/login] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
