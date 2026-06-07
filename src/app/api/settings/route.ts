import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

const defaultSettings = {
  id: 1,
  logoUrl: '/logodki.png',
  bgType: 'image',
  bgImage: '/bg.jpg',
  bgVideo: '',
  bgVideoVolume: 0,
  systemName: 'SIPETUT',
  systemDescription: 'Monitoring & Management System',
  mainColor: '#f97316',
  maintenanceActive: false,
  maintenanceEnd: '',
  maintenanceTitle: 'Sistem Dalam Perbaikan',
  maintenanceDesc: 'Kami sedang melakukan pemeliharaan sistem. Silakan kembali lagi nanti.',
  gpsUpdateInterval: 30,
  roleAccess: {
    ADMIN: {
      '/admin/dashboard': true,
      '/admin/monitoring': true,
      '/admin/online-officers': true,
      '/admin/gps-history': true,
      '/admin/sos': true,
      '/admin/users': true,
      '/admin/attendance': true,
      '/admin/schedules': true,
      '/admin/tasks': true,
      '/admin/reports': true,
      '/admin/settings': true,
    },
    STAFF: {
      '/admin/dashboard': true,
      '/admin/monitoring': true,
      '/admin/online-officers': true,
      '/admin/gps-history': true,
      '/admin/sos': true,
      '/admin/users': true,
      '/admin/attendance': true,
      '/admin/schedules': true,
      '/admin/tasks': true,
      '/admin/reports': true,
      '/admin/settings': false,
    },
    PIMPINAN: {
      '/admin/dashboard': true,
      '/admin/monitoring': true,
      '/admin/online-officers': true,
      '/admin/gps-history': true,
      '/admin/sos': true,
      '/admin/users': false,
      '/admin/attendance': false,
      '/admin/schedules': false,
      '/admin/tasks': false,
      '/admin/reports': true,
      '/admin/settings': false,
    },
  },
  rolePermissions: {
    ADMIN: { canEdit: true, canDelete: true },
    STAFF: { canEdit: true, canDelete: true },
    PIMPINAN: { canEdit: false, canDelete: false },
  },
  footerText: 'Kelurahan Petukangan Utara © 2026',
  footerShowOnAdmin: true,
  footerShowOnLogin: true,
  shifts: [],
  zones: [],
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  try {
    // Ensure gpsUpdateInterval column exists
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN gpsUpdateInterval INT DEFAULT 30');
    } catch { /* column may already exist */ }
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN roleAccess LONGTEXT');
    } catch { /* column may already exist */ }
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN rolePermissions LONGTEXT');
    } catch { /* column may already exist */ }
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN footerText LONGTEXT');
    } catch { /* column may already exist */ }
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN footerShowOnAdmin TINYINT(1) DEFAULT 1');
    } catch { /* column may already exist */ }
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN footerShowOnLogin TINYINT(1) DEFAULT 1');
    } catch { /* column may already exist */ }

    const rows: any = await queryDb('SELECT * FROM system_settings LIMIT 1');
    if (!rows || rows.length === 0) {
      return NextResponse.json(defaultSettings);
    }
    const s = rows[0];
    let shifts = s.shifts;
    let zones = s.zones;
    if (typeof shifts === 'string') {
      try { shifts = JSON.parse(shifts); } catch { shifts = []; }
    }
    if (typeof zones === 'string') {
      try { zones = JSON.parse(zones); } catch { zones = []; }
    }
    let roleAccess = s.roleAccess;
    if (typeof roleAccess === 'string') {
      try { roleAccess = JSON.parse(roleAccess); } catch { roleAccess = defaultSettings.roleAccess; }
    }
    let rolePermissions = s.rolePermissions;
    if (typeof rolePermissions === 'string') {
      try { rolePermissions = JSON.parse(rolePermissions); } catch { rolePermissions = defaultSettings.rolePermissions; }
    }
    return NextResponse.json({
      ...s,
      shifts: shifts || [],
      zones: zones || [],
      gpsUpdateInterval: s.gpsUpdateInterval ?? 30,
      roleAccess: roleAccess || defaultSettings.roleAccess,
      rolePermissions: rolePermissions || defaultSettings.rolePermissions,
      footerText: s.footerText ?? defaultSettings.footerText,
      footerShowOnAdmin: s.footerShowOnAdmin == null ? defaultSettings.footerShowOnAdmin : !!s.footerShowOnAdmin,
      footerShowOnLogin: s.footerShowOnLogin == null ? defaultSettings.footerShowOnLogin : !!s.footerShowOnLogin,
    });
  } catch (err: any) {
    console.error('[GET /api/settings] error:', err.message);
    return NextResponse.json(defaultSettings);
  }
}

export async function POST(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();

    const existing: any = await queryDb('SELECT id FROM system_settings LIMIT 1');
    const shifts = JSON.stringify(data.shifts || []);
    const zones = JSON.stringify(data.zones || []);
    const roleAccess = JSON.stringify(data.roleAccess || defaultSettings.roleAccess);
    const rolePermissions = JSON.stringify(data.rolePermissions || defaultSettings.rolePermissions);
    const footerText = String(data.footerText ?? defaultSettings.footerText);
    const footerShowOnAdmin = data.footerShowOnAdmin === false ? 0 : 1;
    const footerShowOnLogin = data.footerShowOnLogin === false ? 0 : 1;

    // Ensure gpsUpdateInterval column exists before saving
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN gpsUpdateInterval INT DEFAULT 30');
    } catch { /* column may already exist */ }
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN roleAccess LONGTEXT');
    } catch { /* column may already exist */ }
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN rolePermissions LONGTEXT');
    } catch { /* column may already exist */ }
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN footerText LONGTEXT');
    } catch { /* column may already exist */ }
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN footerShowOnAdmin TINYINT(1) DEFAULT 1');
    } catch { /* column may already exist */ }
    try {
      await queryDb('ALTER TABLE system_settings ADD COLUMN footerShowOnLogin TINYINT(1) DEFAULT 1');
    } catch { /* column may already exist */ }

    const gpsUpdateInterval = Number(data.gpsUpdateInterval) || 30;

    if (existing && existing.length > 0) {
      await queryDb(
        `UPDATE system_settings SET logoUrl=?, bgType=?, bgImage=?, bgVideo=?, bgVideoVolume=?, systemName=?, systemDescription=?, mainColor=?, maintenanceActive=?, maintenanceEnd=?, maintenanceTitle=?, maintenanceDesc=?, gpsUpdateInterval=?, roleAccess=?, rolePermissions=?, footerText=?, footerShowOnAdmin=?, footerShowOnLogin=?, shifts=?, zones=?, updatedAt=NOW(6) WHERE id=?`,
        [data.logoUrl || '/logodki.png', data.bgType || 'image', data.bgImage || '/bg.jpg', data.bgVideo || '', data.bgVideoVolume ?? 0, data.systemName || 'SIPETUT', data.systemDescription || 'Monitoring & Management System', data.mainColor || '#f97316', data.maintenanceActive ? 1 : 0, data.maintenanceEnd || '', data.maintenanceTitle || 'Sistem Dalam Perbaikan', data.maintenanceDesc || 'Kami sedang melakukan pemeliharaan sistem. Silakan kembali lagi nanti.', gpsUpdateInterval, roleAccess, rolePermissions, footerText, footerShowOnAdmin, footerShowOnLogin, shifts, zones, existing[0].id]
      );
    } else {
      await queryDb(
        `INSERT INTO system_settings (logoUrl, bgType, bgImage, bgVideo, bgVideoVolume, systemName, systemDescription, mainColor, maintenanceActive, maintenanceEnd, maintenanceTitle, maintenanceDesc, gpsUpdateInterval, roleAccess, rolePermissions, footerText, footerShowOnAdmin, footerShowOnLogin, shifts, zones, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
        [data.logoUrl || '/logodki.png', data.bgType || 'image', data.bgImage || '/bg.jpg', data.bgVideo || '', data.bgVideoVolume ?? 0, data.systemName || 'SIPETUT', data.systemDescription || 'Monitoring & Management System', data.mainColor || '#f97316', data.maintenanceActive ? 1 : 0, data.maintenanceEnd || '', data.maintenanceTitle || 'Sistem Dalam Perbaikan', data.maintenanceDesc || 'Kami sedang melakukan pemeliharaan sistem. Silakan kembali lagi nanti.', gpsUpdateInterval, roleAccess, rolePermissions, footerText, footerShowOnAdmin, footerShowOnLogin, shifts, zones]
      );
    }

    return NextResponse.json({ message: 'Settings updated' });
  } catch (err: any) {
    console.error('[POST /api/settings] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
