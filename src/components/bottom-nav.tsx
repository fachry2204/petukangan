'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { 
    label: 'Home', 
    iconUrl: '/gambar/icon/home.png', 
    href: '/ppsu/home' 
  },
  { 
    label: 'Tugas', 
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2666/2666505.png', 
    href: '/ppsu/tasks' 
  },
  { 
    label: 'SOS', 
    iconUrl: '/icon/sos.png', 
    href: '/ppsu/sos' 
  },
  { 
    label: 'Lapor', 
    iconUrl: '/gambar/icon/lapor.png', 
    href: '/ppsu/reports' 
  },
  { 
    label: 'Profile', 
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', 
    href: '/ppsu/profile' 
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-800 pb-safe z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <div className="flex justify-around items-center h-[72px] w-full max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-2 sm:px-6 md:px-8">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={async (e) => {
                if (item.label === 'SOS') {
                  // Memancarkan sinyal darurat via Socket.io saat diklik
                  try {
                    const { useAuthStore } = await import('@/store/auth-store');
                    const { token, user } = useAuthStore.getState();
                    
                    if (token && user) {
                      const { io } = await import('socket.io-client');
                      const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                      const socket = io(socketUrl, { auth: { token } });
                      
                      // Mengambil lokasi pasti saat menekan tombol
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          socket.emit('emergencySignal', {
                            userId: user.id,
                            fullName: user.fullName,
                            photoUrl: user.photoUrl,
                            phone: user.phone,
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            timestamp: Date.now()
                          });
                          
                          // Disconnect after sending to prevent memory leaks
                          setTimeout(() => socket.disconnect(), 2000);
                        },
                        (err) => console.error('GPS SOS Error', err),
                        { enableHighAccuracy: true, timeout: 5000 }
                      );
                    }
                  } catch (err) {
                    console.error('Failed to send SOS', err);
                  }
                }
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 transition-all duration-300 flex-1 py-1',
                isActive ? 'text-orange-600 font-black' : 'text-zinc-400 font-semibold',
                item.label === 'SOS' ? '-mt-6' : 'active:scale-90' // Make SOS button float slightly
              )}
            >
              <div className={cn(
                "flex items-center justify-center transition-all duration-300",
                item.label === 'SOS' ? "bg-red-500 rounded-full w-14 h-14 p-2.5 shadow-[0_8px_20px_rgba(239,68,68,0.4)] border-4 border-white dark:border-zinc-900 animate-pulse active:scale-95" : ""
              )}>
                <img 
                  src={item.iconUrl} 
                  alt={item.label}
                  className={cn(
                    'object-contain transition-all duration-300', 
                    item.label === 'SOS' ? 'w-full h-full grayscale-0 opacity-100 drop-shadow-md brightness-0 invert' : 'w-8 h-8',
                    isActive && item.label !== 'SOS' ? 'scale-110 opacity-100' : (item.label !== 'SOS' ? 'opacity-40 grayscale hover:opacity-70' : '')
                  )} 
                />
              </div>
              <span className={cn(
                "text-[11px] tracking-tight",
                item.label === 'SOS' ? "text-red-500 font-black drop-shadow-sm mt-0.5" : ""
              )}>{item.label}</span>
              {isActive && item.label !== 'SOS' && (
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
