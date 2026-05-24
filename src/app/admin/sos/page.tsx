'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MapPin, Clock, Phone, Loader2, CheckCircle2, Navigation, CalendarDays, Copy } from 'lucide-react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface EmergencySignal {
  id?: number;
  userId: string | number;
  fullName: string;
  photoUrl?: string;
  phone?: string;
  lat: number;
  lng: number;
  address: string;
  mapLink: string;
  dateSos: string;
  timeSos: string;
  timestamp: number;
  status: 'DARURAT' | 'PETUGAS MELUNCUR' | 'SELESAI';
}

export default function AdminSosPage() {
  const [signals, setSignals] = useState<EmergencySignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // 1. Fetch existing SOS History from Database
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/sos');
        if (res.ok) {
          const data = await res.json();
          // Transform timestamp string from DB to milliseconds for date-fns
          const parsedData = data.map((d: any) => ({
            ...d,
            timestamp: new Date(d.timestamp).getTime()
          }));
          setSignals(parsedData);
        }
      } catch (err) {
        console.error('Failed to load SOS history', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();

    // 2. Connect to socket server for real-time SOS
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const socket = io(socketUrl, {
      auth: { token }
    });

    socket.on('connect', () => {
      socket.emit('joinAdminRoom');
    });

    socket.on('emergencySignal', (data: EmergencySignal) => {
      try {
        const audio = new Audio('/ting.mp3'); 
        audio.play().catch(e => console.log('Audio autoplay blocked', e));
      } catch (err) {}

      setSignals(prev => {
        // Update existing if already in list
        const exists = prev.findIndex(s => s.userId === data.userId && s.status !== 'SELESAI');
        if (exists > -1) {
          const updated = [...prev];
          updated[exists] = { ...updated[exists], ...data };
          return updated;
        }
        return [{ ...data }, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const updateStatus = async (userId: string | number, newStatus: EmergencySignal['status']) => {
    // 1. Update on screen immediately for fast feedback
    setSignals(prev => 
      prev.map(s => s.userId === userId ? { ...s, status: newStatus } : s)
    );

    // 2. Update to Database
    try {
      await fetch('/api/sos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });
    } catch (error) {
      console.error('Failed to sync status to database:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DARURAT': return 'bg-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
      case 'PETUGAS MELUNCUR': return 'bg-orange-500 border-orange-500';
      case 'SELESAI': return 'bg-zinc-300 border-zinc-300';
      default: return 'bg-red-500';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'DARURAT': return 'text-red-700';
      case 'PETUGAS MELUNCUR': return 'text-orange-700';
      case 'SELESAI': return 'text-zinc-600';
      default: return 'text-red-700';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header SOS */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-red-600 dark:text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 animate-pulse" />
            Pusat Komando SOS
          </h2>
          <p className="text-sm text-zinc-500 font-medium mt-1">
            Riwayat dan Pantauan langsung panggilan darurat dari Petugas PPSU
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/20 rounded-full border border-red-100 dark:border-red-900/50">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
          <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Live Listening</span>
        </div>
      </header>

      {/* Daftar Sinyal Darurat */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Situasi Aman Terkendali</h3>
            <p className="text-sm text-zinc-500 mt-1">Belum ada satupun sinyal darurat (SOS) yang tercatat di database.</p>
          </div>
        ) : (
          signals.map((signal, idx) => (
            <Card 
              key={signal.id || `${signal.userId}-${signal.timestamp}`}
              className={`overflow-hidden transition-all duration-500 ${
                signal.status === 'SELESAI' 
                  ? 'opacity-60 grayscale bg-zinc-50 border-zinc-200' 
                  : signal.status === 'PETUGAS MELUNCUR'
                  ? 'bg-orange-50 border-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
                  : 'bg-red-50 border-red-200 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-in slide-in-from-top-4'
              }`}
            >
              <div className={`h-1.5 w-full ${getStatusColor(signal.status)}`} />
              <CardContent className="p-0">
                <div className="flex flex-col xl:flex-row items-center gap-6 p-6">
                  
                  {/* Info Petugas */}
                  <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-full overflow-hidden border-2 flex items-center justify-center bg-white ${getStatusColor(signal.status)}`}>
                        {signal.photoUrl ? (
                          <img src={signal.photoUrl} alt="Profil" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-zinc-400">ID</span>
                        )}
                      </div>
                      {signal.status !== 'SELESAI' && (
                        <div className="absolute -bottom-1 -right-4 bg-zinc-900 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase border border-white">
                          {signal.status}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className={`text-xl font-black ${getStatusTextColor(signal.status)}`}>
                        {signal.fullName || `Petugas ${signal.userId}`}
                      </h3>
                      <p className="text-xs font-bold text-zinc-500 tracking-wider">
                        {signal.phone ? `+${signal.phone}` : `User ID: ${signal.userId}`}
                      </p>
                    </div>
                  </div>

                  {/* Info Detail Database */}
                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4 border-t xl:border-t-0 xl:border-l border-zinc-200 dark:border-zinc-800 pt-4 xl:pt-0 xl:pl-6">
                    <div className="flex items-start gap-2">
                      <CalendarDays className={`w-5 h-5 mt-0.5 ${signal.status === 'SELESAI' ? 'text-zinc-400' : 'text-red-400'}`} />
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Tanggal & Waktu (WIB)</p>
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {signal.dateSos} • {signal.timeSos}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {formatDistanceToNow(signal.timestamp, { addSuffix: true, locale: id })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className={`w-5 h-5 mt-0.5 ${signal.status === 'SELESAI' ? 'text-zinc-400' : 'text-red-400'}`} />
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Titik Lokasi</p>
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug">
                          {signal.address}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <button 
                            onClick={() => router.push(`/admin/monitoring?focus=${signal.userId}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-bold rounded-lg transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Live Monitoring
                          </button>
                          <button 
                            onClick={() => {
                              const mapsLink = signal.mapLink || `https://www.google.com/maps/search/?api=1&query=${signal.lat},${signal.lng}`;
                              navigator.clipboard.writeText(mapsLink);
                              alert('Link Google Maps berhasil disalin ke clipboard!');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[11px] font-bold rounded-lg transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Salin Lokasi
                          </button>
                          <a 
                            href={signal.mapLink || `https://www.google.com/maps/search/?api=1&query=${signal.lat},${signal.lng}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[11px] font-bold rounded-lg transition-colors"
                          >
                            Buka Google Maps
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions / Status Controls */}
                  {signal.status !== 'SELESAI' && (
                    <div className="w-full xl:w-auto shrink-0 flex flex-col sm:flex-row items-center gap-2 border-t xl:border-t-0 border-zinc-200 pt-4 xl:pt-0">
                      {signal.status === 'DARURAT' && (
                        <button 
                          onClick={() => updateStatus(signal.userId, 'PETUGAS MELUNCUR')}
                          className="w-full sm:w-auto px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-[0_4px_14px_rgba(249,115,22,0.4)] transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Navigation className="w-4 h-4" />
                          Kirim Bantuan
                        </button>
                      )}
                      
                      <button 
                        onClick={() => updateStatus(signal.userId, 'SELESAI')}
                        className="w-full sm:w-auto px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-[0_4px_14px_rgba(22,163,74,0.4)] transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
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
