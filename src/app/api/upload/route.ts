import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '@/lib/auth';

function getUserFromToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string; // petugas, absensi, laporan, tugas, izin
    const user = getUserFromToken(request);
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize user name for folder
    const sanitizedName = user.fullName ? user.fullName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_') : 'admin';
    const userFolder = user.role === 'ADMIN' ? `admin-${sanitizedName}` : `${user.id}-${sanitizedName}`;

    // Get current date in DD-MM-YYYY format (for folders that need date)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateFolder = `${day}-${month}-${year}`;

    let baseDir: string;
    switch (type) {
      case 'petugas':
        baseDir = path.join(process.cwd(), 'public', 'gambar', 'petugas', userFolder);
        break;
      case 'absensi':
        baseDir = path.join(process.cwd(), 'public', 'gambar', 'absensi', userFolder, dateFolder);
        break;
      case 'tugas':
        baseDir = path.join(process.cwd(), 'public', 'gambar', 'tugas', userFolder, dateFolder);
        break;
      case 'laporan':
        baseDir = path.join(process.cwd(), 'public', 'gambar', 'laporan', userFolder, dateFolder);
        break;
      case 'izin':
        baseDir = path.join(process.cwd(), 'public', 'gambar', 'izin', userFolder, dateFolder);
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid upload type' }, { status: 400 });
    }

    // Create all necessary folders recursively
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const ext = path.extname(file.name) || '.png';
    const uniqueName = `${type}-${Date.now()}${ext}`;
    const filePath = path.join(baseDir, uniqueName);

    fs.writeFileSync(filePath, buffer);

    // Build the public URL
    const urlPath = baseDir
      .replace(path.join(process.cwd(), 'public'), '')
      .split(path.sep)
      .join('/');
    const fileUrl = `${urlPath}/${uniqueName}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
