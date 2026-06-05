import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ hasToken: false, message: 'No Authorization header' });
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ hasToken: true, valid: false, message: 'Token invalid or expired' });
    }
    return NextResponse.json({ hasToken: true, valid: true, decoded });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
