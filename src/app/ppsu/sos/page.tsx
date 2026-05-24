'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, CheckCircle2, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function PpsuSosPage() {
  const router = useRouter();
  const [dots, setDots] = useState('');

  // Animasi titik loading
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6 pb-24 flex flex-col items-center justify-center min-h-[70vh]">
      
      {/* Efek Radar Ping Darurat */}
      <div className="relative flex items-center justify-center w-full max-w-sm aspect-square mt-8">
        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20 duration-1000"></div>
        <div className="absolute inset-4 bg-red-500 rounded-full animate-ping opacity-40 duration-[1500ms]"></div>
        <div className="absolute inset-12 bg-red-500 rounded-full animate-ping opacity-60 duration-[2000ms]"></div>
        
        <div className="relative z-10 w-40 h-40 bg-gradient-to-b from-red-500 to-red-700 rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.8)] border-4 border-white dark:border-zinc-900">
          <ShieldAlert className="w-16 h-16 text-white mb-1" />
          <span className="text-white font-black text-xl tracking-widest">SOS</span>
        </div>
      </div>

      <div className="text-center space-y-3 mt-8">
        <h2 className="text-2xl font-black text-red-600 dark:text-red-500 uppercase tracking-tight">
          Sinyal Darurat Terkirim!
        </h2>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
          Koordinat GPS dan identitas Anda telah diteruskan secara aktual (Real-Time) ke Kelurahan Petukangan.
        </p>
      </div>

      <Card className="w-full border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden mt-6">
        <CardContent className="p-6">
          <ul className="space-y-4">
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Pesan darurat diterima server</p>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Akurasi GPS dikunci (High Accuracy)</p>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
              </div>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Menunggu respon bantuan{dots}
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Button 
        onClick={() => router.push('/ppsu/home')}
        variant="outline" 
        className="w-full h-14 rounded-2xl font-bold border-2 border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:bg-zinc-50"
      >
        Kembali ke Beranda
      </Button>
    </div>
  );
}
