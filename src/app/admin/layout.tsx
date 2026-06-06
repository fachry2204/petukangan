'use client';

import { AdminSidebar } from '@/components/admin-sidebar';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { useSidebarStore } from '@/store/sidebar-store';
import { cn } from '@/lib/utils';

import { GlobalSOSAlert } from '@/components/global-sos-alert';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { logout } = useAuthStore();
  const isCollapsed = useSidebarStore(state => state.isCollapsed);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-zinc-950 flex">
      <AdminSidebar />
      <div className={cn("flex-1 flex flex-col transition-all duration-300", isCollapsed ? "ml-20" : "ml-64")}>
        <header className="h-20 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-white/70">
          <div>
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">System Monitoring PPSU Kelurahan</h2>
            <p className="text-lg font-bold text-zinc-900 dark:text-white">Main Dashboard</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Administrator</p>
              <p className="text-xs text-zinc-500">Super Admin</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center border border-zinc-200">
                <span className="text-lg font-bold text-orange-600">AD</span>
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
        <main className="p-8">
          <GlobalSOSAlert />
          {children}
        </main>
      </div>
    </div>
  );
}
