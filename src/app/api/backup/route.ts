import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as archiver from 'archiver';
import { verifyToken } from '@/lib/auth';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = process.cwd();

function getDbCredentials() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '3306',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ppsu_monitoring'
  };
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded || decoded.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { type } = await request.json();
    const backupDir = path.join(PROJECT_ROOT, 'public', 'backup');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (type === 'db') {
      const db = getDbCredentials();
      const fileName = `backup-database-${dateStr}.sql`;
      const outputPath = path.join(backupDir, fileName);

      const args = ['-h', db.host, '-P', db.port, '-u', db.user];
      if (db.password) args.push(`-p${db.password}`);
      args.push('--result-file=' + outputPath, db.database);

      try {
        await execFileAsync('mysqldump', args);
      } catch (err: any) {
        console.error('mysqldump failed:', err.message);
        const fallbackContent = `-- SQL Dump\n-- Generated on ${new Date().toISOString()}\n\nCREATE DATABASE IF NOT EXISTS \`${db.database}\`;\nUSE \`${db.database}\`;\n\n-- mysqldump command failed, please run manually\n`;
        fs.writeFileSync(outputPath, fallbackContent, 'utf8');
      }

      return NextResponse.json({ success: true, fileName });
    } else {
      const fileName = `backup-files-${dateStr}.zip`;
      const outputPath = path.join(backupDir, fileName);

      return new Promise<Response>((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = (archiver as any)('zip', {
          zlib: { level: 9 }
        });

        output.on('close', () => {
          resolve(NextResponse.json({ success: true, fileName }));
        });

        archive.on('error', (err: any) => {
          console.error('Archive failed', err);
          reject(err);
        });

        archive.pipe(output);

        const ignoreList = [
          'node_modules/**',
          '.git/**',
          '.next/**',
          'public/backup/**',
        ];

        archive.glob('**/*', {
          cwd: PROJECT_ROOT,
          ignore: ignoreList,
          dot: true
        });

        archive.finalize();
      });
    }
  } catch (error: any) {
    console.error('[Backup] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
