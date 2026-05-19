'use client';

import { useState, useEffect } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PpsuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = useSettingsStore();
  const { token, user } = useAuthStore();
  
  useEffect(() => {
    if (!token || !user || typeof window === 'undefined') return;

    let watchId: number;
    let socket: any;

    const setupTracking = async () => {
      const ioModule = await import('socket.io-client');
      const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      socket = ioModule.io(socketUrl, { auth: { token } });
      
      socket.on('connect', () => {
        if (navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              socket.emit('updateLocation', {
                userId: user.id,
                fullName: user.fullName,
                photoUrl: user.photoUrl,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: Date.now()
              });
            },
            (err) => console.warn('Background tracking GPS error:', err),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
          );
        }
      });
    };

    setupTracking();

    return () => {
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, user]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-zinc-950 pb-20">
      <header className="sticky top-0 z-[999] w-full bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <img src={settings.logoUrl || '/logodki.png'} alt="Logo DKI" className="w-8 h-8 object-contain drop-shadow-sm" />
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-black text-zinc-900 dark:text-white uppercase leading-none">
                {settings.systemName || 'PPSU SMART'}
              </h1>
              {settings.systemDescription && (
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider hidden sm:inline-block">
                  — {settings.systemDescription}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-zinc-500">Live Tracking</span>
          </div>
        </div>
        
        {/* Horizontal Traditional Ornament gigi balang */}
        <div 
          className="absolute left-0 right-0 top-full w-full h-6 bg-repeat-x bg-contain pointer-events-none" 
          style={{ backgroundImage: "url('/gambar/ornamen.png')" }} 
        />
      </header>

      <main className="w-full max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
