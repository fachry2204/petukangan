'use client';

import { AdminSidebar } from '@/components/admin-sidebar';
import { CalendarDays, CheckCircle2, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebarStore } from '@/store/sidebar-store';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settings-store';

import { GlobalSOSAlert } from '@/components/global-sos-alert';

const pageInformation = [
  { path: '/admin/dashboard', title: 'Dashboard Utama', description: 'Ringkasan operasional, jadwal, dan kehadiran petugas hari ini.' },
  { path: '/admin/monitoring', title: 'Live Monitoring', description: 'Pantau posisi dan aktivitas petugas lapangan secara langsung.' },
  { path: '/admin/online-officers', title: 'Petugas Online', description: 'Lihat petugas yang sedang aktif dan terhubung ke sistem.' },
  { path: '/admin/gps-history', title: 'Riwayat GPS', description: 'Telusuri rekam perjalanan dan lokasi petugas.' },
  { path: '/admin/sos', title: 'SOS Petugas', description: 'Tindak lanjuti permintaan bantuan darurat dari lapangan.' },
  { path: '/admin/users', title: 'Data Petugas', description: 'Kelola profil, status, akun, dan informasi petugas.' },
  { path: '/admin/attendance', title: 'Absensi Petugas', description: 'Pantau kehadiran, istirahat, dan kepulangan petugas.' },
  { path: '/admin/schedules', title: 'Jadwal Petugas', description: 'Atur shift, zona kerja, dan penugasan petugas.' },
  { path: '/admin/tasks', title: 'Tugas Lapangan', description: 'Kelola tugas serta bukti pekerjaan dari lapangan.' },
  { path: '/admin/reports', title: 'Laporan Kejadian', description: 'Periksa dan tindak lanjuti laporan dari petugas.' },
  { path: '/admin/settings', title: 'Pengaturan Sistem', description: 'Sesuaikan identitas, tampilan, peran, dan akses aplikasi.' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const isCollapsed = useSidebarStore(state => state.isCollapsed);
  const roleAccess = useSettingsStore(state => state.roleAccess);
  const footerText = useSettingsStore(state => state.footerText);
  const footerShowOnAdmin = useSettingsStore(state => state.footerShowOnAdmin);
  const systemName = useSettingsStore(state => state.systemName);
  const systemDescription = useSettingsStore(state => state.systemDescription);
  const currentPage = pageInformation
    .filter((page) => pathname === page.path || pathname.startsWith(`${page.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0] || {
      title: 'Administrasi Sistem',
      description: 'Kelola seluruh data dan operasional aplikasi.',
    };
  const todayInWib = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
  const userInitials = String(user?.fullName || user?.username || 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  const isAllowed =
    !roleName ||
    roleName === 'ADMIN' ||
    roleAccess?.[roleName]?.[pathname] !== false;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="admin-shell min-h-screen flex">
      <AdminSidebar />
      <div className={cn("flex-1 flex flex-col transition-all duration-300", isCollapsed ? "ml-20" : "ml-64")}>
        <header className="admin-header sticky top-0 z-40 flex min-h-24 items-center justify-between gap-5 border-b border-white/70 px-5 py-4 md:px-8">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">
                {systemName || 'PPSU System'}
              </span>
              <span className="hidden items-center gap-1.5 text-xs font-semibold text-zinc-500 lg:flex">
                <CalendarDays className="h-3.5 w-3.5 text-orange-500" />
                <span suppressHydrationWarning>{todayInWib} · WIB</span>
              </span>
            </div>
            <h1 className="truncate text-xl font-black tracking-tight text-zinc-950 md:text-2xl">{currentPage.title}</h1>
            <p className="mt-0.5 hidden truncate text-xs text-zinc-500 sm:block md:text-sm">{currentPage.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 md:gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 xl:flex">
              <CheckCircle2 className="h-4 w-4" /> Sistem aktif
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">{user?.fullName || user?.username || 'Pengguna'}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{roleName || 'ADMIN'}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-100 shadow-sm">
                <span className="text-lg font-bold text-orange-600">{userInitials}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all duration-300 cursor-pointer shadow-sm group"
                title="Logout"
              >
                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </header>
        <main className="admin-workspace flex-1 p-4 sm:p-6 lg:p-8">
          <GlobalSOSAlert />
          {isAllowed ? (
            children
          ) : (
            <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-8 text-center">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">Akses Ditolak</h3>
              <p className="text-sm text-zinc-500 mt-2">
                Halaman ini tidak diaktifkan untuk role Anda. Silakan hubungi Administrator.
              </p>
            </div>
          )}
        </main>
        {footerShowOnAdmin !== false && (
          <footer className="px-8 pb-6 text-center">
            <p className="text-xs font-medium text-zinc-400">{footerText || 'Kelurahan Petukangan Utara © 2026'}</p>
          </footer>
        )}
      </div>
    </div>
  );
}
