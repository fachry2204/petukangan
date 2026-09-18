'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/sidebar-store';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { canRoleAccessAdminPath, normalizeRoleName } from '@/lib/role-access';
import { bundledIcons } from '@/lib/bundled-icons';

const generalMenuItems = [
  { label: 'Dashboard', iconSrc: '/icon/home.png', href: '/admin/dashboard' },
  { label: 'Live Monitoring', iconSrc: '/gambar/icon/maphome.png', href: '/admin/monitoring' },
  { label: 'Data Petugas Online', iconSrc: '/gambar/icon/office.png', href: '/admin/online-officers' },
  { label: 'Riwayat GPS', iconSrc: '/gambar/icon/checkin.png', href: '/admin/gps-history' },
  { label: 'SOS Petugas', iconSrc: '/icon/sos.png', href: '/admin/sos' },
];

const pjlpMenuItems = [
  { label: 'Petugas', iconSrc: bundledIcons.totalPetugas, href: '/admin/users' },
  { label: 'Absensi Petugas', iconSrc: '/icon/absen.png', href: '/admin/attendance' },
  { label: 'Jadwal Petugas', iconSrc: '/icon/calender.png', href: '/admin/schedules' },
  { label: 'Tugas Lapangan', iconSrc: '/icon/camera.png', href: '/admin/tasks' },
  { label: 'Laporan Kejadian', iconSrc: '/icon/lapor.png', href: '/admin/reports' },
  { label: 'Statistik', iconSrc: bundledIcons.performa, href: '/admin/statistics' },
  { label: 'Settings', iconSrc: '/gambar/icon/key.png', href: '/admin/settings' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { isCollapsed, setCollapsed } = useSidebarStore();
  const logoUrl = useSettingsStore(state => state.logoUrl);
  const systemName = useSettingsStore(state => state.systemName);
  const systemDescription = useSettingsStore(state => state.systemDescription);
  const roleAccess = useSettingsStore(state => state.roleAccess);
  const user = useAuthStore(state => state.user);

  const roleName = normalizeRoleName(user?.role ?? user?.roleName);
  const canAccess = (href: string) => {
    return canRoleAccessAdminPath(roleName, href, roleAccess);
  };

  const filteredGeneral = generalMenuItems.filter((i) => canAccess(i.href));
  const filteredPjlp = pjlpMenuItems.filter((i) => canAccess(i.href));

  return (
    <aside 
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className={cn(
        "admin-sidebar bg-white/95 border-r border-orange-100/70 flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out shadow-[6px_0_30px_rgba(24,24,27,0.07)] backdrop-blur-xl",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Sidebar Header Section */}
      <div className={cn(
        "flex shrink-0 flex-col transition-all duration-300 ease-in-out border-b border-orange-100/70 bg-gradient-to-br from-orange-50/80 via-white to-white",
        isCollapsed ? "p-4 items-center" : "p-8"
      )}>
        <div className="flex items-center gap-3">
          <div className="shrink-0 bg-zinc-50 border border-zinc-100 rounded-xl p-1 shadow-sm">
            <img 
              src={logoUrl || '/logodki.png'} 
              alt="Logo" 
              className="object-contain w-7 h-7" 
            />
          </div>
          <div className={cn(
            "flex flex-col transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
            isCollapsed ? "opacity-0 w-0 max-w-0" : "opacity-100 w-auto max-w-[200px]"
          )}>
            <span className="text-xl font-black tracking-tight leading-tight text-zinc-900">{systemName || "PPSU System"}</span>
            <span className="text-[10px] text-zinc-400 font-medium mt-0.5 uppercase tracking-widest">{(systemDescription || "Monitoring & Management System").slice(0,25)}</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Section */}
      <nav className={cn(
        "min-h-0 flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pt-6",
        isCollapsed ? "px-2" : "px-4"
      )}>
        {filteredGeneral.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-xl transition-all duration-300 group relative',
                isCollapsed ? 'justify-center p-3' : 'px-4 py-3.5 gap-3',
                isActive 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-400' 
                  : 'text-zinc-600 hover:bg-orange-50/70 hover:text-zinc-950'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Image
                src={item.iconSrc}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 object-contain transition-transform duration-300 group-hover:scale-110"
              />
              
              <span className={cn(
                "text-sm font-bold transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
                isCollapsed ? "opacity-0 w-0 max-w-0" : "opacity-100 w-auto max-w-[180px]"
              )}>
                {item.label}
              </span>

              {/* Active Dot / Indicator */}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-glow" />
              )}
            </Link>
          );
        })}

        {/* Kategori PJLP Header */}
        {!isCollapsed ? (
          <div className="px-4 pt-6 pb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Kategori PJLP
          </div>
        ) : (
          <div className="h-px bg-zinc-100 my-4 mx-2" />
        )}

        {filteredPjlp.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-xl transition-all duration-300 group relative',
                isCollapsed ? 'justify-center p-3' : 'px-4 py-3.5 gap-3',
                isActive 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-400' 
                  : 'text-zinc-600 hover:bg-orange-50/70 hover:text-zinc-950'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Image
                src={item.iconSrc}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 object-contain transition-transform duration-300 group-hover:scale-110"
              />
              
              <span className={cn(
                "text-sm font-bold transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
                isCollapsed ? "opacity-0 w-0 max-w-0" : "opacity-100 w-auto max-w-[180px]"
              )}>
                {item.label}
              </span>

              {/* Active Dot / Indicator */}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-glow" />
              )}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
