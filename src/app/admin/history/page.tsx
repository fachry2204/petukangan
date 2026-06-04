'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, MapPin, Search, RefreshCw, Trash2, Clock } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '@/lib/api-config';

const HistoryMap = dynamic(() => import('./history-map'), { ssr: false });

interface GPSPoint {
  id: number;
  userId: number;
  lat: number;
  lng: number;
  timestamp: string;
  fullName?: string;
  photoUrl?: string;
}

const RETENTION_MINUTES = 5;
const REFRESH_INTERVAL_MS = 15_000; // refresh every 15s

// Deterministic color from userId so each officer has a stable trail color
function colorForUser(userId: number): string {
  const palette = [
    '#f97316', '#0ea5e9', '#22c55e', '#a855f7',
    '#ef4444', '#eab308', '#14b8a6', '#ec4899',
    '#6366f1', '#84cc16',
  ];
  return palette[userId % palette.length];
}

export default function AdminHistoryPage() {
  const [points, setPoints] = useState<GPSPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [purging, setPurging] = useState(false);
  const apiUrl = apiUrl || 'http://localhost:3001/api';
  const intervalRef = useRef<any>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/tracking/history`, {
        params: { minutes: RETENTION_MINUTES },
      });
      setPoints(res.data?.points || []);
      setLastFetch(new Date());
    } catch (err) {
      console.error('Failed to fetch GPS history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurge = async () => {
    if (!confirm(`Hapus semua data GPS yang lebih lama dari ${RETENTION_MINUTES} menit?`)) return;
    setPurging(true);
    try {
      await axios.delete(`${apiUrl}/tracking/history/old`, {
        params: { minutes: RETENTION_MINUTES },
      });
      await fetchHistory();
    } catch (err) {
      console.error('Failed to purge GPS history:', err);
      alert('Gagal menghapus data GPS lama.');
    } finally {
      setPurging(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    intervalRef.current = setInterval(fetchHistory, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group points per user (sorted oldest -> newest)
  const userTracks = useMemo(() => {
    const map = new Map<number, GPSPoint[]>();
    for (const p of points) {
      if (p.lat == null || p.lng == null) continue;
      if (!map.has(p.userId)) map.set(p.userId, []);
      map.get(p.userId)!.push(p);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    return map;
  }, [points]);

  const userSummaries = useMemo(() => {
    return Array.from(userTracks.entries()).map(([userId, pts]) => {
      const last = pts[pts.length - 1];
      return {
        userId,
        fullName: last?.fullName || `Petugas ${userId}`,
        photoUrl: last?.photoUrl,
        count: pts.length,
        lastTimestamp: last?.timestamp,
        color: colorForUser(userId),
      };
    }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [userTracks]);

  const filteredSummaries = userSummaries.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  const visibleTracks = useMemo(() => {
    const tracks: { userId: number; color: string; fullName: string; photoUrl?: string; points: GPSPoint[] }[] = [];
    for (const s of userSummaries) {
      if (selectedUserId != null && s.userId !== selectedUserId) continue;
      tracks.push({
        userId: s.userId,
        color: s.color,
        fullName: s.fullName,
        photoUrl: s.photoUrl,
        points: userTracks.get(s.userId) || [],
      });
    }
    return tracks;
  }, [userSummaries, userTracks, selectedUserId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-orange-500" /> Riwayat GPS
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Menampilkan rute petugas dalam {RETENTION_MINUTES} menit terakhir. Data lebih lama dari {RETENTION_MINUTES} menit otomatis dihapus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePurge}
            disabled={purging}
            className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <Trash2 className={`w-4 h-4 ${purging ? 'animate-pulse' : ''}`} />
            Hapus Data Lama
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Petugas</p>
          <p className="text-2xl font-black mt-1">{userSummaries.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Titik GPS</p>
          <p className="text-2xl font-black mt-1">{points.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Window</p>
          <p className="text-2xl font-black mt-1">{RETENTION_MINUTES} mnt</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Update
          </p>
          <p className="text-sm font-bold mt-1.5">
            {lastFetch ? lastFetch.toLocaleTimeString('id-ID') : '—'}
          </p>
        </Card>
      </div>

      {/* Body: list + map */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Left: officers list */}
        <Card className="p-3 flex flex-col gap-3 lg:max-h-[600px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama petugas..."
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
            <span>Petugas ({filteredSummaries.length})</span>
            {selectedUserId != null && (
              <button
                onClick={() => setSelectedUserId(null)}
                className="text-orange-500 hover:underline normal-case font-semibold tracking-normal"
              >
                Tampilkan semua
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 -mr-1 pr-1">
            {filteredSummaries.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-400 italic">
                Belum ada data GPS dalam {RETENTION_MINUTES} menit terakhir.
              </div>
            ) : (
              filteredSummaries.map((s) => {
                const active = selectedUserId === s.userId;
                return (
                  <button
                    key={s.userId}
                    onClick={() => setSelectedUserId(active ? null : s.userId)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                      active
                        ? 'bg-orange-50 border-orange-300 dark:bg-orange-500/10'
                        : 'bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-100/60 dark:border-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {s.photoUrl ? (
                        <img
                          src={s.photoUrl}
                          alt={s.fullName}
                          className="w-9 h-9 rounded-lg object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logodki.png'; }}
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                          style={{ background: s.color }}
                        >
                          {s.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                        style={{ background: s.color }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[12px] truncate">{s.fullName}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {s.count} titik
                        {s.lastTimestamp && (
                          <span className="text-zinc-400 ml-1">
                            • {new Date(s.lastTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge
                      className="ml-auto text-white border-none font-bold text-[9px] px-1.5 py-0.5"
                      style={{ background: s.color }}
                    >
                      {s.count}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Right: Map */}
        <Card className="p-0 overflow-hidden lg:h-[600px] h-[480px]">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
            <h3 className="font-bold text-sm">Peta Riwayat</h3>
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
              {visibleTracks.reduce((acc, t) => acc + t.points.length, 0)} titik
            </span>
          </div>
          <div className="w-full h-[calc(100%-49px)]">
            <HistoryMap tracks={visibleTracks} />
          </div>
        </Card>
      </div>
    </div>
  );
}
