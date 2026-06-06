'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { ShieldAlert, Navigation, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ActiveSOSLock() {
  const { user } = useAuthStore();
  const [activeSOS, setActiveSOS] = useState<any | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [dots, setDots] = useState('');
  const wasLocked = useRef(false);
  const router = useRouter();

  // Animasi titik loading
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Polling status SOS milik user yang belum SELESAI
  useEffect(() => {
    if (!user) return;

    let abortController: AbortController | null = null;

    const checkSOSStatus = async () => {
      // Batalkan request sebelumnya jika ada
      if (abortController) {
        abortController.abort();
      }

      abortController = new AbortController();

      try {
        const res = await fetch('/api/sos', {
          signal: abortController.signal
        });
        if (res.ok) {
          const data = await res.json();
          // Cari sinyal terakhir dari user ini yang BELUM SELESAI
          const mySOS = data.find((s: any) => s.userId == user?.id && s.status !== 'SELESAI');
          
          if (mySOS) {
            setActiveSOS(mySOS);
            wasLocked.current = true;
          } else {
            if (wasLocked.current) {
              // Jika sebelumnya terkunci, dan sekarang tidak ada (berarti diselesaikan admin)
              setIsResolved(true);
              wasLocked.current = false;
              setActiveSOS(null);
            }
          }
        }
      } catch (err: any) {
        // Abaikan error yang disebabkan oleh abort
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    };

    checkSOSStatus();
    const interval = setInterval(checkSOSStatus, 3000); // Poll setiap 3 detik
    return () => {
      clearInterval(interval);
      if (abortController) {
        abortController.abort();
      }
    };
  }, [user]);

  if (!activeSOS && !isResolved) return null;

  if (isResolved) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-green-600 animate-in fade-in duration-500">
        <div className="text-center space-y-6 px-6 max-w-sm w-full">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(255,255,255,0.8)] border-4 border-green-200 animate-bounce">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
          
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
              Situasi Terkendali!
            </h2>
            <p className="text-base font-medium text-green-100 leading-relaxed">
              Pusat telah menyatakan bahwa keadaan darurat Anda telah selesai ditangani dengan aman. Terima kasih atas informasinya!
            </p>
          </div>
          
          <Button 
            onClick={() => {
              setIsResolved(false);
              router.push('/ppsu/home');
            }}
            className="w-full h-14 bg-white hover:bg-zinc-100 text-green-700 font-black rounded-2xl shadow-lg text-lg uppercase tracking-wider mt-4"
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-red-600 animate-in fade-in duration-300">
      {/* Efek Radar Ping Darurat */}
      <div className="relative flex items-center justify-center w-full max-w-sm aspect-square mb-8">
        <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20 duration-1000"></div>
        <div className="absolute inset-4 bg-white rounded-full animate-ping opacity-40 duration-[1500ms]"></div>
        <div className="absolute inset-12 bg-white rounded-full animate-ping opacity-60 duration-[2000ms]"></div>
        
        <div className="relative z-10 w-40 h-40 bg-white rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.8)] border-4 border-red-200">
          <ShieldAlert className="w-16 h-16 text-red-600 mb-1" />
          <span className="text-red-600 font-black text-xl tracking-widest">SOS</span>
        </div>
      </div>

      <div className="text-center space-y-3 px-6 max-w-sm w-full">
        <h2 className="text-3xl font-black text-white uppercase tracking-tight">
          Mode Darurat Aktif!
        </h2>
        <p className="text-sm font-medium text-red-100 leading-relaxed">
          Sinyal SOS Anda telah diterima. Aplikasi dikunci sementara hingga Pusat/Admin menyatakan keadaan aman (SELESAI).
        </p>
        
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 mt-6 border border-white/20 text-left shadow-lg">
          <p className="text-xs text-red-200 font-bold uppercase tracking-wider mb-3">Status Penanganan</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md">
              {activeSOS.status === 'PETUGAS MELUNCUR' ? (
                <Navigation className="w-6 h-6 text-orange-600" />
              ) : (
                <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <p className="font-black text-lg text-white tracking-wide">
                {activeSOS.status}
              </p>
              <p className="text-xs font-medium text-red-100 mt-0.5">
                {activeSOS.status === 'PETUGAS MELUNCUR' 
                  ? 'Bantuan sedang menuju lokasi Anda sekarang.' 
                  : `Menunggu instruksi dari pusat${dots}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
