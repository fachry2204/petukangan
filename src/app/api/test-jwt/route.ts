import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from '@/lib/auth';

export async function GET() {
  const secret = process.env.JWT_SECRET || 'pjlpsmartmonitoring2026';
  const payload = { sub: 1, role: 'ADMIN', test: true };
  
  // Test 1: jwt.sign directly
  const token1 = jwt.sign(payload, secret, { expiresIn: '1d' });
  let verify1: any = null;
  let error1: string | null = null;
  try { verify1 = jwt.verify(token1, secret); } catch (e: any) { error1 = e.message; }
  
  // Test 2: signToken from auth.ts
  const token2 = signToken(payload);
  let verify2: any = null;
  let error2: string | null = null;
  try { verify2 = jwt.verify(token2, secret); } catch (e: any) { error2 = e.message; }
  
  // Test 3: verifyToken from auth.ts
  const verify3 = verifyToken(token2);
  
  return NextResponse.json({
    secret,
    direct: { token: token1, verify: verify1, error: error1 },
    authSign: { token: token2, verify: verify2, error: error2 },
    authVerify: verify3,
    envSecret: process.env.JWT_SECRET || '(default)',
  });
}
