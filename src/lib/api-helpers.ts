import { NextResponse } from 'next/server';
import { getUserFromToken } from './auth';

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function requireAuth(req: Request) {
  const decoded = getUserFromToken(req);
  if (!decoded) return { user: null as ReturnType<typeof getUserFromToken>, response: unauthorizedResponse() };
  return { user: decoded, response: null };
}
