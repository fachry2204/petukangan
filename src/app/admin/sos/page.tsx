'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, Clock, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface EmergencySignal {
  userId: string;
  fullName: string;
  photoUrl: string;
  phone: string;
  lat: number;
  lng: number;
  timestamp: number;
  resolved: boolean;
}

export default function AdminSosPage() {
  const [signals, setSignals] = useState<EmergencySignal[]>([]);
  const { token } = useAuthStore();

  useEffect(() => {
    // Hubungkan ke socket server
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(socketUrl, {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Connected to SOS Tracking System');
      socket.emit('joinAdminRoom');
    });

    // Menangkap sinyal darurat langsung dari petugas
    socket.on('emergencySignal', (data: EmergencySignal) => {
      // Mainkan suara sirine/alert
      try {
        const audio = new Audio('/ting.mp3'); // Fallback sound if needed
        audio.play().catch(e => console.log('Audio autoplay blocked', e));
      } catch (err) {}

      setSignals(prev => {
        // Cek apakah user ini sudah mengirim sinyal sebelumnya untuk menghindari duplikasi spam
        const exists = prev.findIndex(s => s.userId === data.userId && !s.resolved);
        if (exists > -1) {
          const updated = [...prev];
          updated[exists] = { ...updated[exists], ...data };
          return updated;
        }
        return [{ ...data, resolved: false }, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const resolveSignal = (userId: string) => {
    setSignals(prev => 
      prev.map(s => s.userId === userId ? { ...s, resolved: true } : s)
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header SOS */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-red-600 dark:text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 animate-pulse" />
            SOS Emergency Dashboard
          </h2>
          <p className="text-sm text-zinc-500 font-medium mt-1">
            Pantauan langsung panggilan darurat dari Petugas PPSU di lapangan
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/20 rounded-full border border-red-100 dark:border-red-900/50">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
          <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Live Listening</span>
        </div>
      </header>

      {/* Daftar Sinyal Darurat */}
      <div className="grid gap-4">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Situasi Aman Terkendali</h3>
            <p className="text-sm text-zinc-500 mt-1">Belum ada satupun sinyal darurat (SOS) yang diterima saat ini.</p>
          </div>
        ) : (
          signals.map((signal, idx) => (
            <Card 
              key={`${signal.userId}-${signal.timestamp}`}
              className={`overflow-hidden transition-all duration-500 ${
                signal.resolved 
                  ? 'opacity-60 grayscale bg-zinc-50 border-zinc-200' 
                  : 'bg-red-50 border-red-200 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-in slide-in-from-top-4'
              }`}
            >
              <div className={`h-1.5 w-full ${signal.resolved ? 'bg-zinc-300' : 'bg-red-500 animate-pulse'}`} />
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-center gap-6 p-6">
                  
                  {/* Info Petugas */}
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-full overflow-hidden border-2 flex items-center justify-center bg-white ${signal.resolved ? 'border-zinc-300' : 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}>
                        {signal.photoUrl ? (
                          <img src={signal.photoUrl} alt="Profil" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-zinc-400">ID</span>
                        )}
                      </div>
                      {!signal.resolved && (
                        <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border border-white">
                          Darurat
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className={`text-xl font-black ${signal.resolved ? 'text-zinc-600' : 'text-red-700'}`}>
                        {signal.fullName || `Petugas ${signal.userId}`}
                      </h3>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">ID: {signal.userId}</p>
                    </div>
                  </div>

                  {/* Info Detail */}
                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 pt-4 md:pt-0 md:pl-6">
                    <div className="flex items-center gap-2">
                      <Clock className={`w-5 h-5 ${signal.resolved ? 'text-zinc-400' : 'text-red-400'}`} />
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Waktu Kejadian</p>
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {formatDistanceToNow(new Date(signal.timestamp), { addSuffix: true, locale: id })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className={`w-5 h-5 ${signal.resolved ? 'text-zinc-400' : 'text-red-400'}`} />
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Titik Lokasi (GPS)</p>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${signal.lat},${signal.lng}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-sm font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                        >
                          Lihat di Peta
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className={`w-5 h-5 ${signal.resolved ? 'text-zinc-400' : 'text-red-400'}`} />
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Kontak</p>
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {signal.phone ? `+${signal.phone}` : 'Tidak Tersedia'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!signal.resolved && (
                    <div className="w-full md:w-auto shrink-0 flex items-center justify-end">
                      <button 
                        onClick={() => resolveSignal(signal.userId)}
                        className="w-full md:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(239,68,68,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Tandai Selesai
                      </button>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

    </div>
  );
}
