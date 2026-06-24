'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, AlertTriangle, Activity, Search, Eye, EyeOff } from 'lucide-react';
import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { apiUrl } from '@/lib/api-config';
import { socketUrl } from '@/lib/socket-config';

// Dynamic import for Leaflet (No SSR)
const MapComponent = dynamic(() => import('@/components/map-component'), { ssr: false });

function AdminMonitoringContent() {
  const [officers, setOfficers] = useState<any[]>([]);
  const [offlineOfficers, setOfflineOfficers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [activeCenter, setActiveCenter] = useState<[number, number] | null>(null);
  const [activeZoom, setActiveZoom] = useState<number>(12);
  const { token } = useAuthStore();
  const socketRef = useRef<any>(null);

  const searchParams = useSearchParams();
  const focusUserId = searchParams.get('focus');

  useEffect(() => {
    const abortController = new AbortController();

    // 1. Fetch active officers from REST API as initial data / fallback
    const fetchActiveOfficers = async () => {
      try {
        const res = await fetch(`${apiUrl}/tracking/active-officers?minutes=60`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal
        });
        if (res.ok) {
          const data = await res.json();
          if (data.officers && data.officers.length > 0) {
            setOfficers(prev => {
              const newOfficers = [...prev];
              data.officers.forEach((officer: any) => {
                const existingIdx = newOfficers.findIndex(o => o.userId === officer.userId);
                const mapped = {
                  ...officer,
                  status: officer.statusAbsen || 'Online',
                  address: officer.wifiName || officer.provider || 'Lokasi Aktif',
                };
                if (existingIdx > -1) {
                  newOfficers[existingIdx] = { ...newOfficers[existingIdx], ...mapped };
                } else {
                  newOfficers.push(mapped);
                }
              });
              return newOfficers;
            });
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.log('[Admin] Failed to fetch active officers via REST:', err);
        }
      }
    };
    fetchActiveOfficers();

    // 2. Fetch active SOS from API to show SOS markers on map load
    const fetchActiveSOS = async () => {
      try {
        const res = await fetch('/api/sos', {
          signal: abortController.signal
        });
        if (res.ok) {
          const data = await res.json();
          const activeSOS = data.filter((s: any) => s.status !== 'SELESAI');
          if (activeSOS.length > 0) {
            setOfficers(prev => {
              const newOfficers = [...prev];
              activeSOS.forEach((sos: any) => {
                const existingIdx = newOfficers.findIndex(o => o.userId === sos.userId);
                const newData = { ...sos, status: sos.status, isSOS: true };
                if (existingIdx > -1) {
                  newOfficers[existingIdx] = { ...newOfficers[existingIdx], ...newData };
                } else {
                  newOfficers.push(newData);
                }
              });
              return newOfficers;
            });
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.log('[Admin] Failed to fetch SOS:', err);
        }
      }
    };
    fetchActiveSOS();

    // 3. Fetch offline officers with today's schedules
    const fetchOfflineOfficers = async () => {
      try {
        const res = await fetch(`${apiUrl}/schedules/today/officers`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal
        });
        if (res.ok) {
          const data = await res.json();
          setOfflineOfficers(data || []);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.log('Failed to fetch offline officers:', err);
        }
      }
    };
    fetchOfflineOfficers();

    // 4. Setup Socket.io for real-time updates (via same-origin rewrite) only once
    if (!socketRef.current) {
      console.log('[Admin] Connecting to socket:', socketUrl);
      const socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        path: '/socket.io'
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Admin] Connected to Tracking System, socket ID:', socket.id);
        socket.emit('joinAdminRoom');
      });

      socket.on('connect_error', (error) => {
        console.error('[Admin] Socket connection error:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log('[Admin] Socket disconnected:', reason);
      });

    socket.on('locationUpdated', (data) => {
      console.log('[Admin] locationUpdated received:', data);
      setOfficers(prev => {
        const existing = prev.findIndex(o => o.userId === data.userId);
        if (existing > -1) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], ...data };
          if (prev[existing].isSOS) {
            updated[existing].isSOS = true;
            updated[existing].status = 'DARURAT';
          }
          console.log('[Admin] Updated existing officer:', data.userId, 'new state:', updated[existing]);
          return updated;
        }
        console.log('[Admin] Added new officer:', data.userId);
        return [...prev, data];
      });
    });

    socket.on('activeLocationsSync', (activeList) => {
      console.log('[Admin] activeLocationsSync received:', activeList?.length || 0, 'officers');
      if (activeList && activeList.length > 0) {
        activeList.forEach((o: any) => {
          console.log('[Admin] Active officer:', o.userId, o.fullName, 'lat:', o.lat, 'lng:', o.lng);
        });
      }
      setOfficers(prev => {
        const newOfficers = [...prev];
        activeList.forEach((active: any) => {
          const existingIdx = newOfficers.findIndex(o => o.userId === active.userId);
          if (existingIdx > -1) {
            newOfficers[existingIdx] = { ...newOfficers[existingIdx], ...active };
            if (prev[existingIdx].isSOS) {
               newOfficers[existingIdx].isSOS = true;
               newOfficers[existingIdx].status = 'DARURAT';
            }
          } else {
            newOfficers.push(active);
          }
        });
        return newOfficers;
      });
    });

    socket.on('userOffline', (data) => {
      console.log('[Admin] userOffline received:', data);
      setOfficers(prev => {
        const filtered = prev.filter(o => {
          if (o.userId === data.userId && !o.isSOS) {
            console.log('[Admin] Removing officer from map:', data.userId);
            return false;
          }
          return true;
        });
        console.log('[Admin] Officers after userOffline:', filtered.length);
        return filtered;
      });
    });

    socket.on('emergencySignal', (data) => {
      setOfficers(prev => {
        const existingIdx = prev.findIndex(o => o.userId === data.userId);
        const newData = { ...data, status: 'DARURAT', isSOS: true };
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...newData };
          return updated;
        }
        return [...prev, newData];
      });
    });
    }

    return () => {
      abortController.abort();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]);

  // Separate live officers from SOS-only officers
  const liveOfficers = officers.filter(o => !o.isSOS);
  const sosOfficers = officers.filter(o => o.isSOS);

  // Convert officers to map points — only include those with valid GPS coordinates
  // Exclude officers who have checked out (Pulang)
  const mapPoints = officers
    .filter(o => o.lat && o.lng && Number(o.lat) !== 0 && Number(o.lng) !== 0 && o.status !== 'Pulang')
    .map(o => ({
      id: `officer-${o.userId}`,
      lat: o.lat,
      lng: o.lng,
      name: o.fullName || `Petugas ID: ${o.userId}`,
      status: o.status || 'Online',
      photoUrl: o.photoUrl,
      isSOS: o.isSOS,
      address: o.address,
      ipAddress: o.ipAddress,
      device: o.device,
      os: o.os,
      provider: o.provider,
      wifi: o.wifi,
    }));

  const filteredOfficers = officers.filter(o =>
    (o.fullName || `Petugas ${o.userId}`).toLowerCase().includes(searchQuery.toLowerCase())
  );

  let mapCenter: [number, number] = [-6.2088, 106.8456];
  let currentZoom = focusUserId ? 16 : 12;

  if (activeCenter) {
    mapCenter = activeCenter;
    currentZoom = activeZoom;
  } else if (focusUserId) {
    const target = officers.find(o => String(o.userId) === focusUserId);
    if (target && target.lat != null && target.lng != null) {
      mapCenter = [target.lat, target.lng];
    }
  }

  return (
    <div className="relative h-[calc(100vh-80px)] w-[calc(100%+4rem)] -m-8 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* 1. Fullscreen Map Layer */}
      <div className="w-full h-full z-10">
        <MapComponent points={mapPoints} center={mapCenter} zoom={currentZoom} />
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
              placeholder="Cari nama petugas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-zinc-50/50 dark:bg-zinc-900/50 border-none rounded-xl text-xs placeholder:text-zinc-400 font-medium focus:ring-1 focus:ring-orange-500/30"
            />
          </div>
        </div>

        {/* Scrollable Panel Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-4">



          {/* SOS Officers (if any) */}
          {sosOfficers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> SOS Aktif ({sosOfficers.length})
              </h3>
              <div className="space-y-1.5">
                {sosOfficers.map((o, idx) => (
                  <div
                    key={`sos-${idx}`}
                    onClick={() => {
                      if (o.lat && o.lng) {
                        setActiveCenter([o.lat, o.lng]);
                        setActiveZoom(18);
                      }
                    }}
                    className="flex items-center gap-2.5 p-2.5 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-900/40 border border-red-200/40 dark:border-red-900/30 rounded-xl cursor-pointer transition-all active:scale-95"
                  >
                    <div className="relative shrink-0">
                      {o.photoUrl ? (
                        <img
                          src={o.photoUrl}
                          alt={o.fullName}
                          className="w-8 h-8 rounded-lg object-cover"
                          onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-500/10 rounded-lg flex items-center justify-center font-bold text-xs text-red-600">
                          {(o.fullName || 'P').charAt(0)}
                        </div>
                      )}
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white animate-ping" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[11px] text-red-700 dark:text-red-300 truncate">{o.fullName || `Petugas ${o.userId}`}</p>
                      <p className="text-[9px] text-red-500 dark:text-red-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {o.lat && o.lng ? `${Number(o.lat).toFixed(4)}, ${Number(o.lng).toFixed(4)}` : 'Lokasi tidak diketahui'}
                      </p>
                    </div>
                    <Badge className="ml-auto bg-red-500 text-white border-none font-bold text-[8px] px-1.5 py-0.5 shrink-0 animate-pulse">
                      DARURAT
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Active Officers List */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Petugas Online ({filteredOfficers.filter(o => !o.isSOS).length})
            </h3>

            <div className="space-y-1.5">
              {filteredOfficers.filter(o => !o.isSOS).length === 0 ? (
                <div className="py-6 text-center text-[11px] text-zinc-400">
                  <p className="font-semibold">Belum ada petugas aktif terpantau.</p>
                  <p className="mt-1 text-[10px]">Pastikan petugas sudah login di aplikasi PJLP dan memberikan izin GPS.</p>
                </div>
              ) : (
                filteredOfficers.filter(o => !o.isSOS).map((o, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (o.lat && o.lng) {
                        setActiveCenter([o.lat, o.lng]);
                        setActiveZoom(18);
                      }
                    }}
                    className="flex items-center justify-between p-2.5 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 border border-zinc-100/50 dark:border-zinc-800/30 rounded-xl transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {o.photoUrl ? (
                        <img
                          src={o.photoUrl}
                          alt={o.fullName}
                          className="w-8 h-8 rounded-lg object-cover border border-zinc-100"
                          onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-500/10 rounded-lg flex items-center justify-center font-bold text-xs text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
                          {(o.fullName || 'P').charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-[11px] text-zinc-800 dark:text-zinc-200">{o.fullName || `Petugas ${o.userId}`}</p>
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                          {(o.lat && o.lng && Number(o.lat) !== 0) ? (
                            <><MapPin className="w-2.5 h-2.5 text-orange-500" />{Number(o.lat).toFixed(4)}, {Number(o.lng).toFixed(4)}</>
                          ) : (
                            <span className="text-zinc-400 italic flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />Menunggu GPS...</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge className={cn(
                        "border-none font-bold text-[8px] px-1.5 py-0.5",
                        o.status === 'Pulang' && "bg-gray-100 text-gray-600",
                        o.status === 'Kembali Bekerja' && "bg-blue-100 text-blue-600",
                        o.status === 'Istirahat' && "bg-yellow-100 text-yellow-600",
                        o.status === 'Absen Masuk' && "bg-green-100 text-green-600",
                        (!o.status || o.status === 'Online') && "bg-green-100 text-green-600"
                      )}>
                        {o.status || 'Online'}
                      </Badge>
                      <span className="text-[8px] text-zinc-400">
                        {o.timestamp ? new Date(o.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Offline Officers with Schedules */}
          {offlineOfficers.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Petugas Offline ({offlineOfficers.length})
              </h3>
              <div className="space-y-1.5">
                {offlineOfficers.map((o, idx) => (
                  <div
                    key={`offline-${idx}`}
                    className="flex items-center justify-between p-2.5 bg-gray-50/50 dark:bg-zinc-900/40 border border-gray-100/50 dark:border-zinc-800/30 rounded-xl transition-all opacity-70"
                  >
                    <div className="flex items-center gap-2.5">
                      {o.photoUrl ? (
                        <img
                          src={o.photoUrl}
                          alt={o.fullName}
                          className="w-8 h-8 rounded-lg object-cover border border-zinc-100 grayscale"
                          onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center font-bold text-xs text-gray-500 dark:text-zinc-400">
                          {(o.fullName || 'P').charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-[11px] text-zinc-600 dark:text-zinc-300">{o.fullName || `Petugas ${o.userId}`}</p>
                        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                          {o.scheduleTime || 'Jadwal: -'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-gray-100 text-gray-500 border-none font-bold text-[8px] px-1.5 py-0.5">
                        OFFLINE
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AdminMonitoringPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-zinc-500">Memuat monitoring...</div>}>
      <AdminMonitoringContent />
    </Suspense>
  );
}
