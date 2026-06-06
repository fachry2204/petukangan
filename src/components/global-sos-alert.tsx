'use client';

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { socketUrl } from '@/lib/socket-config';
import { AlertTriangle, MapPin, Navigation, X, Volume2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export function GlobalSOSAlert() {
  const { token } = useAuthStore();
  const [activeSOS, setActiveSOS] = useState<any | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousSOSRef = useRef<any>(null);
  const dismissedSOSRef = useRef<number | null>(null);

  // Jika pindah halaman, reset dismiss tracker agar modal muncul lagi
  useEffect(() => {
    dismissedSOSRef.current = null;
  }, [pathname]);

  // Inisialisasi audio element sekali saja
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio('/alarm.mp3');
    audio.loop = true;
    audio.volume = 0.9;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const startAlarm = () => {
    if (!audioRef.current) return;
    // Jika sudah sedang diputar, jangan restart
    if (!audioRef.current.paused) return;
    audioRef.current.currentTime = 0;
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setAudioBlocked(false))
        .catch(() => setAudioBlocked(true)); // Browser memblokir autoplay
    }
  };

  const stopAlarm = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setAudioBlocked(false);
  };

  const activateAudioManually = () => {
    if (!audioRef.current) return;
    audioRef.current.play()
      .then(() => setAudioBlocked(false))
      .catch(console.error);
  };

  const dismissModal = () => {
    stopAlarm();
    if (activeSOS) {
      dismissedSOSRef.current = activeSOS.id;
    }
    setActiveSOS(null);
  };

  useEffect(() => {
    if (!token) return;

    const checkSOSStatus = async () => {
      try {
        const res = await fetch('/api/sos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const active = data.find((s: any) => s.status !== 'SELESAI');

          if (active) {
            if (dismissedSOSRef.current !== active.id) {
              setActiveSOS(active);
              previousSOSRef.current = active;
              // Selalu coba putar alarm — startAlarm() akan mengecek sendiri
              // apakah audio sudah diputar atau tidak (via .paused check)
              startAlarm();
            }
          } else {
            if (previousSOSRef.current) {
              setActiveSOS(null);
              stopAlarm();
              previousSOSRef.current = null;
              dismissedSOSRef.current = null;
            }
          }
        }
      } catch (err: any) {
        console.warn('[SOS] Polling error:', err?.message || String(err));
      }
    };

    checkSOSStatus();
    const interval = setInterval(checkSOSStatus, 3000);

    const socket = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'], path: '/socket.io' });

    socket.on('connect', () => {
      socket.emit('joinAdminRoom');
    });

    socket.on('emergencySignal', (data: any) => {
      if (dismissedSOSRef.current !== data.id) {
        setActiveSOS(data);
        previousSOSRef.current = data;
        startAlarm();
      }
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
      stopAlarm();
    };
  }, [token]);

  if (!activeSOS) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 border-4 border-red-600 rounded-[2rem] w-full max-w-lg shadow-[0_0_80px_rgba(239,68,68,0.4)] relative overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 animate-pulse" />

        <button
          onClick={dismissModal}
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
          <p className="text-zinc-500 font-medium mb-4">Sebuah sinyal SOS darurat (Tingkat Tinggi) baru saja ditekan dari lapangan.</p>

          {/* Tombol aktifkan suara jika autoplay diblokir browser */}
          {audioBlocked && (
            <button
              onClick={activateAudioManually}
              className="mb-4 flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-100 transition-colors animate-pulse"
            >
              <Volume2 className="w-4 h-4" />
              Klik untuk Aktifkan Suara Alarm
            </button>
          )}

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
                  Lat: {Number(activeSOS.lat || 0).toFixed(5)} • Lng: {Number(activeSOS.lng || 0).toFixed(5)}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              dismissModal();
              router.push('/admin/sos');
            }}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-2xl shadow-[0_8px_20px_rgba(239,68,68,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <Navigation className="w-5 h-5" />
            Lihat Sinyal SOS
          </button>
        </div>
      </div>
    </div>
  );
}
