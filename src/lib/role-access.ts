export const ADMIN_PAGE_PATHS = [
  '/admin/dashboard',
  '/admin/monitoring',
  '/admin/online-officers',
  '/admin/gps-history',
  '/admin/sos',
  '/admin/users',
  '/admin/attendance',
  '/admin/schedules',
  '/admin/tasks',
  '/admin/reports',
  '/admin/statistics',
  '/admin/settings',
] as const;

export type RoleAccessConfig = Record<string, Record<string, boolean>>;

export function normalizeRoleName(role: unknown): string {
  const value = typeof role === 'string'
    ? role
    : role && typeof role === 'object' && 'name' in role
      ? (role as { name?: unknown }).name
      : role && typeof role === 'object' && 'roleName' in role
        ? (role as { roleName?: unknown }).roleName
      : '';

  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  // Administrator accounts have existed under several display labels.
  // Treat every administrator alias as the canonical ADMIN role so that
  // persisted sessions and database-backed accounts receive identical access.
  if (['ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN', 'SUPERADMIN'].includes(normalized)) {
    return 'ADMIN';
  }

  return normalized;
}

export function getAdminPagePath(pathname: string): string | null {
  return [...ADMIN_PAGE_PATHS]
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`)) || null;
}

export function canRoleAccessAdminPath(
  role: unknown,
  pathname: string,
  roleAccess: RoleAccessConfig | null | undefined,
): boolean {
  const roleName = normalizeRoleName(role);
  if (roleName === 'ADMIN') return true;
  if (!roleName) return false;

  const pagePath = getAdminPagePath(pathname);
  if (!pagePath) return false;

  // Fail closed: an absent role or page setting must never grant access.
  return roleAccess?.[roleName]?.[pagePath] === true;
}

export function firstAllowedAdminPath(
  role: unknown,
  roleAccess: RoleAccessConfig | null | undefined,
): string | null {
  return ADMIN_PAGE_PATHS.find((path) => canRoleAccessAdminPath(role, path, roleAccess)) || null;
}
