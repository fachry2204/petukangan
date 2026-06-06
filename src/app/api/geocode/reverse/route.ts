import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

const cache = new Map<string, { address: string; expiresAt: number }>();

export async function GET(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    if (!latStr || !lngStr) return NextResponse.json({ error: 'lat dan lng wajib diisi' }, { status: 400 });

    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: 'lat/lng tidak valid' }, { status: 400 });

    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({ address: cached.address });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
          'User-Agent': 'sipetut-petukangan/1.0',
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);
    if (!res.ok) return NextResponse.json({ address: null }, { status: 200 });

    const data: any = await res.json();
    const address = data?.display_name ? String(data.display_name) : null;
    if (address) cache.set(key, { address, expiresAt: now + 1000 * 60 * 10 });
    return NextResponse.json({ address });
  } catch (err: any) {
    return NextResponse.json({ address: null }, { status: 200 });
  }
}

