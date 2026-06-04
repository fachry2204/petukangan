'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Calendar, User, Route, Clock, Battery, Navigation, Search, Filter, Download, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { apiUrl } from '@/lib/api-config';

const MapComponent = dynamic(() => import('@/components/map-component'), { ssr: false });

interface GPSPoint {
  id: number;
  userId: number;
  lat: number;
  lng: number;
  timestamp: string;
  fullName: string;
  photoUrl?: string;
  speed?: number;
  batteryLevel?: number;
  isMock?: boolean;
  ipAddress?: string;
  wifiName?: string;
  provider?: string;
  statusAbsen?: string;
}

interface UserOption {
  userId: number;
  fullName: string;
}

export default function GPSHistoryPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const apiUrl = apiUrl || 'http://localhost:3001/api';

  const [gpsPoints, setGpsPoints] = useState<GPSPoint[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const [mapZoom, setMapZoom] = useState(13);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [focusMarker, setFocusMarker] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

  // Fetch GPS history
  const fetchGPSHistory = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const userIdParam = selectedUser !== 'all' ? `&userId=${selectedUser}` : '';
      const res = await axios.get(
        `${apiUrl}/tracking/gps-history?startDate=${startDate}&endDate=${endDate}${userIdParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGpsPoints(res.data.points || []);
    } catch (error) {
      console.error('Failed to fetch GPS history:', error);
      toast({ title: 'Error', description: 'Gagal memuat riwayat GPS', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users for filter
  const fetchAllUsers = async () => {
    if (!token) return;
    try {
      const res = await axios.get(
        `${apiUrl}/users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const allUsers = (res.data || []).map((u: any) => ({
        userId: u.id,
        fullName: u.fullName || `Petugas ${u.id}`,
      }));
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    fetchGPSHistory();
    fetchAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, startDate, endDate, selectedUser]);

  // Click outside to close user dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter points by search query
  const filteredPoints = useMemo(() => {
    if (!searchQuery.trim()) return gpsPoints;
    const q = searchQuery.toLowerCase();
    return gpsPoints.filter(p => 
      p.fullName?.toLowerCase().includes(q) ||
      p.lat.toString().includes(q) ||
      p.lng.toString().includes(q)
    );
  }, [gpsPoints, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredPoints.length / itemsPerPage);
  const paginatedPoints = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPoints.slice(start, start + itemsPerPage);
  }, [filteredPoints, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [gpsPoints, searchQuery]);

  // Group points by user for display
  const pointsByUser = useMemo(() => {
    const grouped: Record<number, GPSPoint[]> = {};
    filteredPoints.forEach(p => {
      if (!grouped[p.userId]) grouped[p.userId] = [];
      grouped[p.userId].push(p);
    });
    return grouped;
  }, [filteredPoints]);

  // Build map markers: semua titik sebagai waypoint dot kecil + Awal/Akhir foto besar
  const mapPoints = useMemo(() => {
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const userColors: Record<number, string> = {};
    let colorIdx = 0;
    Object.keys(pointsByUser).forEach(userId => {
      userColors[Number(userId)] = colors[colorIdx % colors.length];
      colorIdx++;
    });

    const markers: any[] = [];
    Object.entries(pointsByUser).forEach(([userId, pts]) => {
      if (pts.length === 0) return;
      const sorted = [...pts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const color = userColors[Number(userId)];

      sorted.forEach((p, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === sorted.length - 1;
        markers.push({
          id: `gps-${p.id}`,
          lat: p.lat,
          lng: p.lng,
          name: p.fullName || `Petugas ${p.userId}`,
          status: isStart ? `Awal: ${format(parseISO(p.timestamp), 'HH:mm')}`
                : isEnd ? `Akhir: ${format(parseISO(p.timestamp), 'HH:mm')}`
                : format(parseISO(p.timestamp), 'HH:mm:ss'),
          photoUrl: p.photoUrl,
          isStart,
          isEnd,
          isWaypoint: !isStart && !isEnd,
          pathColor: color,
          batteryLevel: p.batteryLevel,
          speed: p.speed,
          ipAddress: p.ipAddress,
          wifiName: p.wifiName,
          provider: p.provider,
          statusAbsen: p.statusAbsen,
        });
      });
    });
    return markers;
  }, [pointsByUser]);

  // Build polyline paths per user for route visualization
  const mapPaths = useMemo(() => {
    const paths: { userId: number; name: string; color: string; coords: [number, number][] }[] = [];
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    let colorIdx = 0;
    Object.entries(pointsByUser).forEach(([userId, pts]) => {
      if (pts.length >= 2) {
        const sorted = [...pts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        paths.push({
          userId: Number(userId),
          name: sorted[0].fullName || `Petugas ${userId}`,
          color: colors[colorIdx % colors.length],
          coords: sorted.map(p => [p.lat, p.lng] as [number, number]),
        });
        colorIdx++;
      }
    });
    return paths;
  }, [pointsByUser]);

  // Filtered users for search dropdown
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u => u.fullName.toLowerCase().includes(q));
  }, [users, userSearch]);

  const selectedUserName = selectedUser === 'all' ? 'Semua Petugas' : users.find(u => u.userId.toString() === selectedUser)?.fullName || 'Pilih Petugas';

  // Handle table row click: fly to map marker popup + scroll to map
  const handleRowClick = (point: GPSPoint) => {
    setMapCenter([point.lat, point.lng]);
    setMapZoom(18);
    setFlyTrigger(prev => prev + 1);
    setFocusMarker(`gps-${point.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const uniqueUsers = new Set(filteredPoints.map(p => p.userId)).size;
    const totalPoints = filteredPoints.length;
    const mockCount = filteredPoints.filter(p => p.isMock).length;
    
    // Calculate total distance (simplified)
    let totalDistance = 0;
    Object.values(pointsByUser).forEach(userPoints => {
      for (let i = 1; i < userPoints.length; i++) {
        const prev = userPoints[i - 1];
        const curr = userPoints[i];
        const dist = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
        totalDistance += dist;
      }
    });

    return { uniqueUsers, totalPoints, mockCount, totalDistance };
  }, [filteredPoints, pointsByUser]);

  // Calculate distance between two coordinates in meters
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['No', 'Nama Petugas', 'Latitude', 'Longitude', 'Waktu', 'Kecepatan (km/h)', 'Baterai (%)', 'Mock GPS'];
    const rows = filteredPoints.map((p, i) => [
      i + 1,
      p.fullName || `Petugas ${p.userId}`,
      p.lat,
      p.lng,
      format(parseISO(p.timestamp), 'dd/MM/yyyy HH:mm:ss'),
      p.speed || '-',
      p.batteryLevel || '-',
      p.isMock ? 'Ya' : 'Tidak'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `riwayat-gps-${startDate}-sd-${endDate}.csv`;
    link.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Riwayat GPS</h1>
          <p className="text-sm text-zinc-500">Lacak perjalanan petugas dari absen masuk sampai pulang</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="overflow-visible">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Tanggal Mulai</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Tanggal Selesai</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* User Filter - Searchable Dropdown */}
              <div className="space-y-2 relative" ref={userDropdownRef}>
                <label className="text-sm font-medium text-zinc-700">Petugas</label>
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="w-full flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-colors"
                >
                  <span className={selectedUser === 'all' ? 'text-zinc-500' : 'text-zinc-900'}>
                    {selectedUserName}
                  </span>
                  <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg">
                    <div className="p-2 border-b border-zinc-100">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Cari petugas..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full h-8 pl-7 pr-2 text-sm rounded-md border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto py-1">
                      <button
                        className={`w-full px-3 py-2 text-sm text-left hover:bg-zinc-50 transition-colors ${selectedUser === 'all' ? 'bg-zinc-50 font-medium text-zinc-900' : 'text-zinc-700'}`}
                        onClick={() => { setSelectedUser('all'); setIsUserDropdownOpen(false); setUserSearch(''); }}
                      >
                        Semua Petugas
                      </button>
                      {filteredUsers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-zinc-400">Tidak ada petugas</div>
                      ) : (
                        <>
                          {filteredUsers.map((u) => (
                            <button
                              key={u.userId}
                              className={`w-full px-3 py-2 text-sm text-left hover:bg-zinc-50 transition-colors ${selectedUser === u.userId.toString() ? 'bg-zinc-50 font-medium text-zinc-900' : 'text-zinc-700'}`}
                              onClick={() => { setSelectedUser(u.userId.toString()); setIsUserDropdownOpen(false); setUserSearch(''); }}
                            >
                              {u.fullName}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Cari</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="Cari nama atau koordinat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <Button onClick={fetchGPSHistory} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
              <p className="text-sm text-zinc-500">Petugas Aktif</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalPoints}</p>
              <p className="text-sm text-zinc-500">Total Titik GPS</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Route className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(stats.totalDistance / 1000).toFixed(1)}</p>
              <p className="text-sm text-zinc-500">Total Jarak (km)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Navigation className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.mockCount}</p>
              <p className="text-sm text-zinc-500">Deteksi Fake GPS</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            Peta Perjalanan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px]">
            <MapComponent points={mapPoints} paths={mapPaths} center={mapCenter} zoom={mapZoom} flyToCenter={!!mapCenter} flyTrigger={flyTrigger} focusMarker={focusMarker} />
          </div>
        </CardContent>
      </Card>

      {/* GPS Points Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Detail Titik GPS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600">No</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600">Petugas</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600">Koordinat</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600">Waktu</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600">Kecepatan</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600">Baterai</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedPoints.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      {loading ? 'Memuat data...' : 'Tidak ada data GPS untuk periode ini'}
                    </td>
                  </tr>
                ) : (
                  paginatedPoints.map((point, index) => (
                    <tr key={point.id} className="hover:bg-zinc-50 cursor-pointer transition-colors" onClick={() => handleRowClick(point)}>
                      <td className="px-4 py-3 text-sm text-zinc-600">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {point.photoUrl ? (
                            <img src={point.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs">
                              {(point.fullName || 'P')[0]}
                            </div>
                          )}
                          <span className="font-medium text-zinc-900">{point.fullName || `Petugas ${point.userId}`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-zinc-600">
                        {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {format(parseISO(point.timestamp), 'dd MMM yyyy HH:mm:ss', { locale: id })}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {point.speed ? `${point.speed} km/h` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {point.batteryLevel ? (
                          <div className="flex items-center gap-1">
                            <Battery className="w-4 h-4" />
                            {point.batteryLevel}%
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {point.isMock ? (
                          <Badge variant="destructive" className="text-xs">Fake GPS</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-700 text-xs">Valid</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
              <div className="text-sm text-zinc-500">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPoints.length)} dari {filteredPoints.length} data
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                  .map((p, idx, arr) => (
                    <div key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-2 text-zinc-400">...</span>
                      )}
                      <Button
                        variant={currentPage === p ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 w-8 p-0 ${currentPage === p ? 'bg-zinc-900 text-white' : ''}`}
                      >
                        {p}
                      </Button>
                    </div>
                  ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
