'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { socketUrl } from '@/lib/socket-config';

const navItems = [
  { label: 'Home', iconUrl: '/gambar/icon/home.png', href: '/pjlp/home' },
  { label: 'Tugas', iconUrl: '/gambar/icon/camera.png', href: '/pjlp/tasks' },
  { label: 'SOS', iconUrl: '/icon/sos.png', href: '#' }, // Prevents accidental navigation
  { label: 'Lapor', iconUrl: '/gambar/icon/lapor.png', href: '/pjlp/reports' },
  { label: 'Profil', iconUrl: '/icons/dashboard/petugas-aktif-orange.png', href: '/pjlp/profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const getGPS = async (): Promise<GeolocationPosition> => {
    if (!navigator.geolocation) {
      throw new Error('Perangkat tidak mendukung GPS.');
    }

    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    if (window.location.protocol !== 'https:' && !isLocalhost) {
      throw new Error('Akses lokasi butuh HTTPS. Gunakan domain HTTPS atau localhost.');
    }

    try {
      if (navigator.permissions) {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (perm.state === 'denied') {
          throw new Error('Akses lokasi DITOLAK. Aktifkan izin lokasi pada browser/perangkat Anda.');
        }
      }
    } catch {
      // ignore permissions API errors
    }

    const getCurrent = (opts: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      });

    let cached: GeolocationPosition | null = null;
    try {
      cached = await getCurrent({ enableHighAccuracy: false, timeout: 4000, maximumAge: Infinity });
      if (cached.coords.accuracy && cached.coords.accuracy <= 150) return cached;
    } catch {
      cached = null;
    }

    try {
      return await getCurrent({ enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
    } catch (e1: any) {
      try {
        await sleep(250);
        return await getCurrent({ enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 });
      } catch {
        if (cached) return cached;
        throw e1;
      }
    }
  };

  const confirmAndSendSOS = async () => {
    setIsSendingSOS(true);
    try {
      const { useAuthStore } = await import('@/store/auth-store');
      const { token, user } = useAuthStore.getState();
      
      if (!token || !user) throw new Error('Not authenticated');

      const { io } = await import('socket.io-client');
      const socket = io(socketUrl, { auth: { token }, path: '/socket.io' });

      // Validasi GPS tersedia — wajib ada lokasi nyata
      let finalLat: number;
      let finalLng: number;
      let finalAddress = 'Alamat sedang diverifikasi';

      try {
        const pos = await getGPS();
        finalLat = pos.coords.latitude;
        finalLng = pos.coords.longitude;
        setGpsError(null);

        // Geocoding otomatis (tidak blokir pengiriman SOS)
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3000);
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${finalLat}&lon=${finalLng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'id' }, signal: controller.signal },
        )
          .then(r => r.json())
          .then(data => { finalAddress = data.display_name || finalAddress; })
          .catch(() => {})
          .finally(() => clearTimeout(t));

      } catch (gpsErr: any) {
        // GPS gagal — tampilkan pesan error, JANGAN kirim SOS dengan koordinat palsu
        console.warn('GPS error:', gpsErr);
        const msg = gpsErr?.code === 1
          ? 'Akses lokasi DITOLAK. Buka pengaturan browser dan izinkan lokasi, lalu coba lagi.'
          : gpsErr?.code === 2
            ? 'GPS tidak tersedia saat ini. Pastikan berada di area terbuka dan coba lagi.'
            : gpsErr?.code === 3
              ? 'Pencarian GPS timeout. Pastikan GPS aktif dan coba lagi.'
              : (gpsErr?.message || 'Gagal mendapatkan lokasi GPS. Pastikan GPS diaktifkan dan coba lagi.');
        setGpsError(msg);
        setIsSendingSOS(false);
        return;
      }

      const payload = {
        userId: user.id,
        fullName: user.fullName,
        photoUrl: user.photoUrl,
        phone: user.phone,
        lat: finalLat,
        lng: finalLng,
        address: finalAddress,
        timestamp: Date.now()
      };

      let hasExecuted = false;
      const executeSOS = async () => {
        if (hasExecuted) return;
        hasExecuted = true;
        
        try {
          await axios.post('/api/sos', payload);
        } catch (e) {
          console.error('Failed to save SOS via API', e);
        }

        socket.emit('emergencySignal', payload);
        // Tunggu sebentar lalu redirect
        setTimeout(() => {
          socket.disconnect();
          setShowSOSModal(false);
          setIsSendingSOS(false);
          router.push('/pjlp/sos');
        }, 1000);
      };

      if (socket.connected) {
        executeSOS();
      } else {
        socket.on('connect', executeSOS);
        setTimeout(() => {
          executeSOS();
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to send SOS', err);
      setIsSendingSOS(false);
      alert('Gagal mengirim SOS. Coba lagi!');
    }
  };

  return (
    <>
      <nav aria-label="Navigasi petugas" className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-t border-zinc-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_35px_rgba(24,24,27,0.1)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mx-auto flex h-[76px] w-full items-center justify-around px-1 min-[380px]:px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href && item.label !== 'SOS';
            
            // Replaces Link completely for SOS to handle the Modal logic instead
            if (item.label === 'SOS') {
              return (
                <button
                  key="sos-btn"
                  onClick={() => setShowSOSModal(true)}
                  className="-mt-7 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1 transition-all duration-300"
                  aria-label="Kirim SOS"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-red-400 to-red-600 p-3 shadow-[0_10px_26px_rgba(239,68,68,0.42)] transition-all duration-300 active:scale-95 dark:border-zinc-900">
                    <img 
                      src={item.iconUrl} 
                      alt={item.label}
                      className="w-full h-full object-contain grayscale-0 opacity-100 drop-shadow-md brightness-0 invert" 
                    />
                  </div>
                  <span className="text-[11px] tracking-tight text-red-500 font-black drop-shadow-sm mt-0.5">SOS</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 py-1 transition-all duration-300 active:scale-90',
                  isActive ? 'text-orange-600 font-black' : 'text-zinc-400 font-semibold'
                )}
              >
                <img 
                  src={item.iconUrl} 
                  alt={item.label}
                  className={cn(
                    'h-7 w-7 object-contain transition-all duration-300',
                    isActive ? 'scale-110 opacity-100 drop-shadow-sm' : 'opacity-65 hover:scale-105 hover:opacity-90'
                  )} 
                />
                <span className="max-w-full truncate text-[10px] tracking-tight min-[380px]:text-[11px]">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* SOS Confirmation Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border-2 border-red-500 rounded-3xl p-6 max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-150 text-center">
            
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
              <AlertTriangle className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-black text-red-600 uppercase tracking-tight mb-2">
              Keadaan Darurat?
            </h3>
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed">
              Apakah Anda yakin dalam keadaan bahaya dan sangat membutuhkan bantuan?
              <br /><span className="text-xs font-medium text-zinc-400 font-normal mt-2 block">(Lokasi & alamat Anda saat ini akan segera dikirim ke Pusat)</span>
            </p>

            {/* GPS Error Message */}
            {gpsError && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-left">
                <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">⚠ Lokasi Tidak Tersedia</p>
                <p className="text-xs font-medium text-amber-800 leading-relaxed">{gpsError}</p>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                disabled={isSendingSOS}
                onClick={() => { setShowSOSModal(false); setGpsError(null); }}
                className="flex-1 h-14 rounded-2xl font-bold"
              >
                TIDAK, BATAL
              </Button>
              <Button 
                type="button" 
                disabled={isSendingSOS}
                onClick={confirmAndSendSOS}
                className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-600/30 text-lg uppercase tracking-wider relative overflow-hidden"
              >
                {isSendingSOS ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'YA, TOLONG!'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
