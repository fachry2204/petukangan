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
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/8643/8643324.png', 
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
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 transition-all duration-300 flex-1 py-1 active:scale-90',
                isActive ? 'text-orange-600 font-black' : 'text-zinc-400 font-semibold'
              )}
            >
              <img 
                src={item.iconUrl} 
                alt={item.label}
                className={cn(
                  'w-8 h-8 object-contain transition-all duration-300', 
                  isActive ? 'scale-110 opacity-100' : 'opacity-40 grayscale hover:opacity-70',
                  item.label === 'SOS' ? 'grayscale-0 opacity-100 drop-shadow-md' : ''
                )} 
              />
              <span className="text-[11px] tracking-tight">{item.label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
