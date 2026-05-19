'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { AlertTriangle, MapPin, Navigation, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function GlobalSOSAlert() {
  const { token } = useAuthStore();
  const [activeSOS, setActiveSOS] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!token) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(socketUrl, { auth: { token } });

    socket.on('connect', () => {
      socket.emit('joinAdminRoom');
    });

    socket.on('emergencySignal', (data: any) => {
      // Set the active SOS to show the modal globally
      setActiveSOS(data);

      try {
        const audio = new Audio('/ting.mp3');
        audio.play().catch(e => console.log('Audio autoplay blocked', e));
      } catch (err) {}
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  if (!activeSOS) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 border-4 border-red-600 rounded-[2rem] w-full max-w-lg shadow-[0_0_80px_rgba(239,68,68,0.4)] relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 animate-pulse" />
        
        <button 
          onClick={() => setActiveSOS(null)}
          className="absolute top-4 right-4 w-10 h-10 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
            <AlertTriangle className="w-12 h-12" />
          </div>

          <h2 className="text-3xl font-black text-red-600 uppercase tracking-tighter mb-2 leading-none">
            PETUGAS DALAM BAHAYA!
          </h2>
          <p className="text-zinc-500 font-medium mb-8">Sebuah sinyal SOS darurat (Tingkat Tinggi) baru saja ditekan dari lapangan.</p>

          <div className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 text-left border border-zinc-100 dark:border-zinc-800 mb-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full border-2 border-red-500 overflow-hidden bg-white shrink-0">
                {activeSOS.photoUrl ? (
                  <img src={activeSOS.photoUrl} alt="Petugas" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">ID</div>
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Identitas Petugas</p>
                <p className="font-bold text-lg text-zinc-900 dark:text-white leading-tight">
                  {activeSOS.fullName || `User ID: ${activeSOS.userId}`}
                </p>
                <p className="text-sm font-medium text-zinc-500">{activeSOS.phone ? `+${activeSOS.phone}` : 'Kontak Tidak Diketahui'}</p>
              </div>
            </div>

            <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Lokasi Terkunci</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm leading-snug">
                  {activeSOS.address || 'Alamat sedang dikalkulasi...'}
                </p>
                <p className="text-xs text-blue-600 font-bold mt-1">
                  Lat: {activeSOS.lat.toFixed(5)} • Lng: {activeSOS.lng.toFixed(5)}
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              setActiveSOS(null);
              router.push('/admin/sos');
            }}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-2xl shadow-[0_8px_20px_rgba(239,68,68,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <Navigation className="w-5 h-5" />
            Pantau dan Tangani Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
