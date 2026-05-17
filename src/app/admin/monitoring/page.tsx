'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, CheckCircle2, AlertTriangle, Activity, Search, Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Dynamic import for Leaflet (No SSR)
const MapComponent = dynamic(() => import('@/components/map-component'), { ssr: false });

export default function AdminMonitoringPage() {
  const [officers, setOfficers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    // 1. Setup Socket.io
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Connected to Tracking System');
      socket.emit('joinAdminRoom');
    });

    socket.on('locationUpdated', (data) => {
      setOfficers(prev => {
        const existing = prev.findIndex(o => o.userId === data.userId);
        if (existing > -1) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], ...data };
          return updated;
        }
        return [...prev, data];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Convert officers to map points
  const mapPoints = officers.map(o => ({
    lat: o.lat,
    lng: o.lng,
    name: `Petugas ID: ${o.userId}`,
    status: 'Online'
  }));

  const filteredOfficers = officers.filter(o => 
    `Petugas ${o.userId}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative h-[calc(100vh-80px)] w-[calc(100%+4rem)] -m-8 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* 1. Fullscreen Map Layer */}
      <div className="w-full h-full z-10">
        <MapComponent points={mapPoints} />
      </div>

      {/* 2. Floating Toggle Button (Appears when panel is hidden) */}
      <button 
        onClick={() => setIsPanelVisible(true)} 
        className={cn(
          "absolute top-4 left-4 z-[1000] w-11 h-11 rounded-2xl bg-white/95 dark:bg-zinc-950/95 text-zinc-700 hover:text-orange-500 shadow-lg backdrop-blur-md border border-white/20 dark:border-zinc-800/80 flex items-center justify-center cursor-pointer transition-all duration-300 transform active:scale-95",
          isPanelVisible ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
        title="Tampilkan Panel"
      >
        <Eye className="w-5 h-5 animate-pulse" />
      </button>

      {/* 3. Compact Floating Glassmorphism Command Hub Panel */}
      <div className={cn(
        "absolute top-4 left-4 z-[1000] w-[310px] max-h-[calc(100%-32px)] flex flex-col bg-white/92 dark:bg-zinc-950/95 backdrop-blur-lg rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-white/25 dark:border-zinc-800/80 p-4 overflow-hidden transition-all duration-500 ease-in-out",
        isPanelVisible ? "translate-x-0 opacity-100 scale-100" : "-translate-x-[340px] opacity-0 scale-95 pointer-events-none"
      )}>
        
        {/* Header Section */}
        <div className="space-y-3 shrink-0 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded">
                Live Tracking
              </span>
              <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">Monitoring</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Sektor Petukangan Utara</p>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Badge className="bg-green-500 hover:bg-green-600 text-white border-none font-bold px-2 py-0.5 text-[9px] flex items-center gap-0.5">
                <Activity className="w-2.5 h-2.5 animate-pulse" /> LIVE
              </Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsPanelVisible(false)} 
                className="h-7 w-7 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-zinc-900 cursor-pointer"
                title="Sembunyikan Panel"
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input 
              placeholder="Cari ID petugas..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-zinc-50/50 dark:bg-zinc-900/50 border-none rounded-xl text-xs placeholder:text-zinc-400 font-medium focus:ring-1 focus:ring-orange-500/30"
            />
          </div>
        </div>

        {/* Scrollable Panel Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-4">
          
          {/* Quick Mini Stats Grid */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="bg-blue-50/40 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100/20">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Users className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Online</span>
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-0.5">{officers.length}</h3>
            </div>

            <div className="bg-green-50/40 dark:bg-green-950/20 p-2.5 rounded-xl border border-green-100/20">
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Selesai</span>
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-0.5">12</h3>
            </div>

            <div className="bg-orange-50/40 dark:bg-orange-950/20 p-2.5 rounded-xl border border-orange-100/20">
              <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Laporan</span>
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-0.5">5</h3>
            </div>

            <div className="bg-purple-50/40 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-100/20">
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Absen</span>
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-0.5">45</h3>
            </div>
          </div>

          {/* Active Officers List */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Petugas Aktif ({filteredOfficers.length})
            </h3>
            
            <div className="space-y-1.5">
              {filteredOfficers.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-zinc-400 italic">
                  Belum ada petugas aktif terpantau.
                </div>
              ) : (
                filteredOfficers.map((o, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2.5 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 border border-zinc-100/50 dark:border-zinc-800/30 rounded-xl transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-500/10 rounded-lg flex items-center justify-center font-bold text-xs text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
                        {o.userId}
                      </div>
                      <div>
                        <p className="font-bold text-[11px] text-zinc-800 dark:text-zinc-200">Petugas {o.userId}</p>
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-orange-500" />
                          Lat: {o.lat.toFixed(4)}, Lng: {o.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    
                    <Badge className="bg-green-100 text-green-600 border-none font-bold text-[8px] px-1.5 py-0.5">
                      AKTIF
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
