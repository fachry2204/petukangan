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
  const { token } = useAuthStore();
  
  // Permission states: null = checking, true = granted, false = denied/blocked
  const [permissionsState, setPermissionsState] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // If there is no authenticated session, we don't enforce checks here (auth-store redirects to login)
    if (!token) {
      setPermissionsState(true);
      return;
    }

    const checkGlobalPermissions = async () => {
      try {
        setPermissionsState(null);

        // 1. Check Geolocation GPS
        if (!navigator.geolocation) {
          throw new Error('Perangkat Anda tidak mendukung GPS Geolocation.');
        }

        const gpsPromise = new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
          });
        });

        // 2. Check Camera Permission
        const cameraPromise = navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' }
        });

        // Wait for both permissions to be granted
        const [gpsPos, stream] = await Promise.all([gpsPromise, cameraPromise]) as [any, MediaStream];

        // Immediately release/stop the camera stream on layout level so the hardware indicator turns off
        stream.getTracks().forEach(track => track.stop());

        setPermissionsState(true);
      } catch (err: any) {
        console.warn('Global permission request failed:', err);
        setPermissionsState(false);
        if (err.name === 'NotAllowedError' || err.code === 1) {
          setErrorMessage('Izin Kamera atau Lokasi GPS diblokir browser. Harap izinkan akses pada setelan aplikasi browser Anda.');
        } else {
          setErrorMessage(err.message || 'Gagal mengakses Kamera atau GPS Anda.');
        }
      }
    };

    checkGlobalPermissions();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-zinc-950 pb-20">
      <header className="sticky top-0 z-[999] w-full bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-lg font-black text-zinc-900 dark:text-white uppercase">
              {settings.systemName || 'PPSU SMART'}
            </h1>
            {settings.systemDescription && (
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                — {settings.systemDescription}
              </span>
            )}
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

      {permissionsState === null ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-zinc-500 text-sm font-semibold">Memeriksa Izin Kamera & GPS...</p>
        </div>
      ) : permissionsState === true ? (
        <main className="w-full max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          {children}
        </main>
      ) : null}

      <BottomNav />

      {/* Global Non-closable Permissions Overlay Modal */}
      <>
        {permissionsState === false && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-2xl animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-155">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <ShieldAlert className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-zinc-900 dark:text-white">Izin Kamera & GPS Wajib</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Untuk menggunakan aplikasi **{settings.systemName || 'SIPETUT'}**, Anda wajib mengaktifkan izin Kamera dan lokasi GPS pada perangkat Anda.
                </p>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 text-red-600 text-xs p-3.5 rounded-2xl text-left leading-relaxed">
                  {errorMessage || 'Harap berikan izin akses Kamera & GPS di browser Anda.'}
                </div>
              </div>

              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 rounded-2xl shadow-lg shadow-red-600/20 transition-all active:scale-95"
              >
                Izinkan & Aktifkan Sekarang
              </Button>
            </div>
          </div>
        )}
      </>
    </div>
  );
}
