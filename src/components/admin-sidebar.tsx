'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Users, 
  Calendar, 
  Settings, 
  ClipboardCheck,
  AlertTriangle,
  History,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MonitorSmartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/sidebar-store';
import { useSettingsStore } from '@/store/settings-store';

import { Siren } from 'lucide-react'; // Ensure Siren is imported if missing

const generalMenuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
  { label: 'Live Monitoring', icon: MapIcon, href: '/admin/monitoring' },
  { label: 'Data Petugas Online', icon: MonitorSmartphone, href: '/admin/online-officers' },
  { label: 'Monitoring Petugas Dalam Bahaya', icon: Siren, href: '/admin/sos' },
  { label: 'Riwayat GPS', icon: History, href: '/admin/gps-history' },
];

const ppsuMenuItems = [
  { label: 'Petugas', icon: Users, href: '/admin/users' },
  { label: 'Absensi Petugas', icon: ClipboardCheck, href: '/admin/attendance' },
  { label: 'Jadwal Petugas', icon: Calendar, href: '/admin/schedules' },
  { label: 'Tugas Lapangan', icon: ClipboardList, href: '/admin/tasks' },
  { label: 'Laporan Kejadian', icon: AlertTriangle, href: '/admin/reports' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { isCollapsed, setCollapsed } = useSidebarStore();
  const settings = useSettingsStore();

  return (
    <aside 
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className={cn(
        "bg-white border-r border-zinc-100 flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.12)]",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Sidebar Header Section */}
      <div className={cn(
        "flex flex-col transition-all duration-300 ease-in-out border-b border-zinc-100",
        isCollapsed ? "p-4 items-center" : "p-8"
      )}>
        <div className="flex items-center gap-3">
          <div className="shrink-0 bg-zinc-50 border border-zinc-100 rounded-xl p-1 shadow-sm">
            <img 
              src={settings.logoUrl || "/logodki.png"} 
              alt="Logo" 
              className="object-contain w-7 h-7" 
            />
          </div>
          <div className={cn(
            "flex flex-col transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
            isCollapsed ? "opacity-0 w-0 max-w-0" : "opacity-100 w-auto max-w-[200px]"
          )}>
            <span className="text-xl font-black tracking-tight leading-tight text-zinc-900">{settings.systemName || "SIPETUT"}</span>
            <span className="text-[10px] text-zinc-400 font-medium mt-0.5 uppercase tracking-wider">{settings.systemDescription.slice(0,25)}</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Section */}
      <nav className={cn(
        "flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pt-6",
        isCollapsed ? "px-2" : "px-4"
      )}>
        {generalMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-xl transition-all duration-300 group relative',
                isCollapsed ? 'justify-center p-3' : 'px-4 py-3.5 gap-3',
                isActive 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn(
                'w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110', 
                isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-700'
              )} />
              
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

        {/* Kategori PPSU Header */}
        {!isCollapsed ? (
          <div className="px-4 pt-6 pb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Kategori PPSU
          </div>
        ) : (
          <div className="h-px bg-zinc-100 my-4 mx-2" />
        )}

        {ppsuMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-xl transition-all duration-300 group relative',
                isCollapsed ? 'justify-center p-3' : 'px-4 py-3.5 gap-3',
                isActive 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn(
                'w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110', 
                isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-700'
              )} />
              
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

      {/* Sidebar Footer Section */}
      <div className={cn(
        "border-t border-zinc-100 mt-auto transition-all duration-300",
        isCollapsed ? "p-2 flex justify-center" : "p-4"
      )}>
        <Link
          href="/admin/settings"
          className={cn(
            "flex items-center rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all duration-300",
            isCollapsed ? "p-3" : "px-4 py-3 gap-3 w-full"
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className={cn(
            "text-sm font-bold transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
            isCollapsed ? "opacity-0 w-0 max-w-0" : "opacity-100 w-auto max-w-[180px]"
          )}>
            Settings
          </span>
        </Link>
      </div>
    </aside>
  );
}
