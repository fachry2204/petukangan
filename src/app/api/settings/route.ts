import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';
import { DEFAULT_MAP_VISIBILITY, normalizeMapVisibility } from '@/lib/map-visibility';
import { canRoleAccessAdminPath } from '@/lib/role-access';

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
  bgImage: '',
  bgVideo: '',
  bgVideoVolume: 0,
  systemName: 'PPSU System',
  systemDescription: 'Monitoring & Management System',
  villageName: '',
  officerIdPrefix: 'PJLP',
  attendanceMode: 'SCHEDULED',
  mainColor: '#f97316',
  maintenanceActive: false,
  maintenanceEnd: '',
  maintenanceTitle: 'Sistem Dalam Perbaikan',
  maintenanceDesc: 'Kami sedang melakukan pemeliharaan sistem. Silakan kembali lagi nanti.',
  gpsUpdateInterval: 30,
  mapVisibility: DEFAULT_MAP_VISIBILITY,
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
      '/admin/statistics': true,
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
      '/admin/statistics': true,
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
      '/admin/statistics': true,
      '/admin/settings': false,
    },
  },
  rolePermissions: {
    ADMIN: { canEdit: true, canDelete: true },
    STAFF: { canEdit: true, canDelete: true },
    PIMPINAN: { canEdit: false, canDelete: false },
  },
  footerText: '',
  footerShowOnAdmin: true,
  footerShowOnLogin: true,
  shifts: [],
  zones: [],
  updatedAt: new Date().toISOString(),
};

function mergeRoleAccess(value: unknown) {
  const source = value && typeof value === 'object' ? value as Record<string, Record<string, boolean>> : {};
  return Object.fromEntries(
    Object.entries(defaultSettings.roleAccess).map(([role, defaults]) => [
      role,
      { ...defaults, ...(source[role] || {}) },
    ]),
  );
}

let settingsSchemaPromise: Promise<void> | null = null;

function ensureSettingsSchema() {
  if (settingsSchemaPromise) return settingsSchemaPromise;

  settingsSchemaPromise = (async () => {
    const columns = await queryDb('SHOW COLUMNS FROM system_settings') as Array<{ Field: string }>;
    const existing = new Set((columns || []).map((column) => column.Field));
    const migrations = [
      ['gpsUpdateInterval', 'ALTER TABLE system_settings ADD COLUMN gpsUpdateInterval INT DEFAULT 30'],
      ['mapVisibility', 'ALTER TABLE system_settings ADD COLUMN mapVisibility LONGTEXT'],
      ['officerIdPrefix', "ALTER TABLE system_settings ADD COLUMN officerIdPrefix VARCHAR(10) NOT NULL DEFAULT 'PJLP'"],
      ['attendanceMode', "ALTER TABLE system_settings ADD COLUMN attendanceMode VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'"],
      ['villageName', "ALTER TABLE system_settings ADD COLUMN villageName VARCHAR(150) NOT NULL DEFAULT ''"],
      ['roleAccess', 'ALTER TABLE system_settings ADD COLUMN roleAccess LONGTEXT'],
      ['rolePermissions', 'ALTER TABLE system_settings ADD COLUMN rolePermissions LONGTEXT'],
      ['footerText', 'ALTER TABLE system_settings ADD COLUMN footerText LONGTEXT'],
      ['footerShowOnAdmin', 'ALTER TABLE system_settings ADD COLUMN footerShowOnAdmin TINYINT(1) DEFAULT 1'],
      ['footerShowOnLogin', 'ALTER TABLE system_settings ADD COLUMN footerShowOnLogin TINYINT(1) DEFAULT 1'],
    ] as const;

    for (const [column, sql] of migrations) {
      if (!existing.has(column)) await queryDb(sql);
    }
  })().catch((error) => {
    settingsSchemaPromise = null;
    throw error;
  });

  return settingsSchemaPromise;
}

export async function GET() {
  try {
    await ensureSettingsSchema();

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
      officerIdPrefix: s.officerIdPrefix || defaultSettings.officerIdPrefix,
      villageName: String(s.villageName || defaultSettings.villageName),
      attendanceMode: s.attendanceMode === 'FREE' ? 'FREE' : 'SCHEDULED',
      mapVisibility: normalizeMapVisibility(s.mapVisibility),
      roleAccess: mergeRoleAccess(roleAccess),
      rolePermissions: rolePermissions || defaultSettings.rolePermissions,
      footerText: s.footerText === 'Kelurahan Petukangan Utara © 2026' ? '' : (s.footerText ?? defaultSettings.footerText),
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
    if (!['ADMIN', 'STAFF', 'PIMPINAN'].includes(String(decoded.role).trim().toUpperCase())) {
      return NextResponse.json({ error: 'Hanya administrator yang dapat mengubah pengaturan.' }, { status: 403 });
    }

    const accessRows: any = await queryDb('SELECT roleAccess FROM system_settings LIMIT 1');
    let storedRoleAccess = defaultSettings.roleAccess;
    const rawRoleAccess = accessRows?.[0]?.roleAccess;
    if (rawRoleAccess) {
      try {
        storedRoleAccess = typeof rawRoleAccess === 'string' ? JSON.parse(rawRoleAccess) : rawRoleAccess;
      } catch { /* gunakan akses default jika data lama rusak */ }
    }
    if (!canRoleAccessAdminPath(decoded.role, '/admin/settings', storedRoleAccess)) {
      return NextResponse.json({ error: 'Role Anda tidak memiliki akses ke Pengaturan Sistem.' }, { status: 403 });
    }

    const data = await req.json();
    const officerIdPrefix = String(data.officerIdPrefix ?? defaultSettings.officerIdPrefix).trim().toUpperCase();
    if (!/^[A-Z]{2,10}$/.test(officerIdPrefix)) {
      return NextResponse.json({ error: 'Prefix ID Petugas harus 2–10 huruf tanpa angka atau spasi.' }, { status: 400 });
    }
    const attendanceMode = data.attendanceMode ?? defaultSettings.attendanceMode;
    if (attendanceMode !== 'SCHEDULED' && attendanceMode !== 'FREE') {
      return NextResponse.json({ error: 'Mode absen petugas tidak valid.' }, { status: 400 });
    }
    const villageName = String(data.villageName ?? defaultSettings.villageName).trim().slice(0, 150);

    const existing: any = await queryDb('SELECT id FROM system_settings LIMIT 1');
    const shifts = JSON.stringify(data.shifts || []);
    const zones = JSON.stringify(data.zones || []);
    const roleAccess = JSON.stringify(mergeRoleAccess(data.roleAccess));
    const rolePermissions = JSON.stringify(data.rolePermissions || defaultSettings.rolePermissions);
    const mapVisibility = JSON.stringify(normalizeMapVisibility(data.mapVisibility));
    const footerText = data.footerText === 'Kelurahan Petukangan Utara © 2026'
      ? ''
      : String(data.footerText ?? defaultSettings.footerText);
    const footerShowOnAdmin = data.footerShowOnAdmin === false ? 0 : 1;
    const footerShowOnLogin = data.footerShowOnLogin === false ? 0 : 1;

    await ensureSettingsSchema();

    const gpsUpdateInterval = Number(data.gpsUpdateInterval) || 30;

    if (existing && existing.length > 0) {
      await queryDb(
        `UPDATE system_settings SET logoUrl=?, bgType=?, bgImage=?, bgVideo=?, bgVideoVolume=?, systemName=?, systemDescription=?, villageName=?, officerIdPrefix=?, attendanceMode=?, mainColor=?, maintenanceActive=?, maintenanceEnd=?, maintenanceTitle=?, maintenanceDesc=?, gpsUpdateInterval=?, mapVisibility=?, roleAccess=?, rolePermissions=?, footerText=?, footerShowOnAdmin=?, footerShowOnLogin=?, shifts=?, zones=?, updatedAt=NOW(6) WHERE id=?`,
        [data.logoUrl || '/logodki.png', data.bgType || 'image', data.bgImage || '', data.bgVideo || '', data.bgVideoVolume ?? 0, data.systemName || 'PPSU System', data.systemDescription || 'Monitoring & Management System', villageName, officerIdPrefix, attendanceMode, data.mainColor || '#f97316', data.maintenanceActive ? 1 : 0, data.maintenanceEnd || '', data.maintenanceTitle || 'Sistem Dalam Perbaikan', data.maintenanceDesc || 'Kami sedang melakukan pemeliharaan sistem. Silakan kembali lagi nanti.', gpsUpdateInterval, mapVisibility, roleAccess, rolePermissions, footerText, footerShowOnAdmin, footerShowOnLogin, shifts, zones, existing[0].id]
      );
    } else {
      await queryDb(
        `INSERT INTO system_settings (logoUrl, bgType, bgImage, bgVideo, bgVideoVolume, systemName, systemDescription, villageName, officerIdPrefix, attendanceMode, mainColor, maintenanceActive, maintenanceEnd, maintenanceTitle, maintenanceDesc, gpsUpdateInterval, mapVisibility, roleAccess, rolePermissions, footerText, footerShowOnAdmin, footerShowOnLogin, shifts, zones, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
        [data.logoUrl || '/logodki.png', data.bgType || 'image', data.bgImage || '', data.bgVideo || '', data.bgVideoVolume ?? 0, data.systemName || 'PPSU System', data.systemDescription || 'Monitoring & Management System', villageName, officerIdPrefix, attendanceMode, data.mainColor || '#f97316', data.maintenanceActive ? 1 : 0, data.maintenanceEnd || '', data.maintenanceTitle || 'Sistem Dalam Perbaikan', data.maintenanceDesc || 'Kami sedang melakukan pemeliharaan sistem. Silakan kembali lagi nanti.', gpsUpdateInterval, mapVisibility, roleAccess, rolePermissions, footerText, footerShowOnAdmin, footerShowOnLogin, shifts, zones]
      );
    }

    return NextResponse.json({ message: 'Settings updated' });
  } catch (err: any) {
    console.error('[POST /api/settings] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
