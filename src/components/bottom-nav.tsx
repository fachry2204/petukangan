'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const navItems = [
  { label: 'Home', iconUrl: '/gambar/icon/home.png', href: '/ppsu/home' },
  { label: 'Tugas', iconUrl: 'https://cdn-icons-png.flaticon.com/512/2666/2666505.png', href: '/ppsu/tasks' },
  { label: 'SOS', iconUrl: '/icon/sos.png', href: '#' }, // Prevents accidental navigation
  { label: 'Lapor', iconUrl: '/gambar/icon/lapor.png', href: '/ppsu/reports' },
  { label: 'Profile', iconUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', href: '/ppsu/profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const confirmAndSendSOS = async () => {
    setIsSendingSOS(true);
    try {
      const { useAuthStore } = await import('@/store/auth-store');
      const { token, user } = useAuthStore.getState();
      
      if (!token || !user) throw new Error('Not authenticated');

      const { io } = await import('socket.io-client');
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '/';
      const socket = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'], path: '/socket.io' });

      // Validasi GPS tersedia — wajib ada lokasi nyata
      if (!navigator.geolocation) {
        setGpsError('Perangkat tidak mendukung GPS. Tidak bisa mengirim SOS.');
        setIsSendingSOS(false);
        return;
      }

      // Promise wrapper untuk mendapatkan GPS dengan timeout
      const getGPS = () => new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          enableHighAccuracy: true,
          timeout: 10000, 
          maximumAge: 5000
        });
      });

      let finalLat: number;
      let finalLng: number;
      let finalAddress = 'Alamat sedang diverifikasi';

      try {
        const pos = await getGPS();
        finalLat = pos.coords.latitude;
        finalLng = pos.coords.longitude;
        setGpsError(null);

        // Geocoding otomatis (tidak blokir pengiriman SOS)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${finalLat}&lon=${finalLng}&zoom=18&addressdetails=1`, {
          headers: { 'Accept-Language': 'id' },
          signal: AbortSignal.timeout(3000)
        })
          .then(r => r.json())
          .then(data => { finalAddress = data.display_name || finalAddress; })
          .catch(() => {});

      } catch (gpsErr: any) {
        // GPS gagal — tampilkan pesan error, JANGAN kirim SOS dengan koordinat palsu
        console.warn('GPS error:', gpsErr);
        const msg = gpsErr?.code === 1
          ? 'Akses lokasi DITOLAK. Buka pengaturan browser dan izinkan lokasi, lalu coba lagi.'
          : gpsErr?.code === 2
          ? 'GPS tidak tersedia saat ini. Pastikan berada di area terbuka dan coba lagi.'
          : 'Gagal mendapatkan lokasi GPS. Pastikan GPS diaktifkan dan coba lagi.';
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
          router.push('/ppsu/sos');
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-800 pb-safe z-40 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex justify-around items-center h-[72px] w-full max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-2 sm:px-6 md:px-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href && item.label !== 'SOS';
            
            // Replaces Link completely for SOS to handle the Modal logic instead
            if (item.label === 'SOS') {
              return (
                <button
                  key="sos-btn"
                  onClick={() => setShowSOSModal(true)}
                  className="flex flex-col items-center justify-center gap-1.5 transition-all duration-300 flex-1 py-1 -mt-6"
                >
                  <div className="flex items-center justify-center transition-all duration-300 bg-red-500 rounded-full w-14 h-14 p-2.5 shadow-[0_8px_20px_rgba(239,68,68,0.4)] border-4 border-white dark:border-zinc-900 animate-pulse active:scale-95">
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
                  'flex flex-col items-center justify-center gap-1.5 transition-all duration-300 flex-1 py-1 active:scale-90',
                  isActive ? 'text-orange-600 font-black' : 'text-zinc-400 font-semibold'
                )}
              >
                <img 
                  src={item.iconUrl} 
                  alt={item.label}
                  className={cn(
                    'w-8 h-8 object-contain transition-all duration-300', 
                    isActive ? 'scale-110 opacity-100' : 'opacity-40 grayscale hover:opacity-70'
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

      {/* SOS Confirmation Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border-2 border-red-500 rounded-3xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-150 text-center">
            
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
