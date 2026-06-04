'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { useRealtimeEntity } from '@/hooks/use-realtime';
import { apiUrl } from '@/lib/api-config';
import { 
  Users, FileText, Clock, Search, MapPin, 
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, 
  X, Check, Ban, Eye, Map, Smartphone, Info, Sparkles
} from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/map-component'), { ssr: false });

interface User {
  id: number;
  username: string;
  fullName: string;
  photoUrl: string;
  role?: any;
}

interface AttendanceItem {
  id: number;
  type: string;
  timestamp: string;
  lat: number;
  lng: number;
  address: string;
  photoUrl: string;
  reason: string;
  rejectionReason: string;
  isMock: boolean;
  status: string; // 'VALID' | 'PENDING' | 'APPROVED' | 'REJECTED'
  isOutsideSchedule: boolean;
  isLembur?: boolean;
  isRequestTable?: boolean;
  user: User;
  deviceInfo?: string;
}

export default function AdminAttendancePage() {
  const router = useRouter();
  const { token, user, logout } = useAuthStore();

  // State Management
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedMapItem, setSelectedMapItem] = useState<any | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'absensi' | 'izin' | 'request' | 'lembur'>('absensi');

  // Modals
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [selectedRejectionId, setSelectedRejectionId] = useState<number | null>(null);
  const [selectedRejectionIsRequestTable, setSelectedRejectionIsRequestTable] = useState(false);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);

  // Check Role Name
  const roleName = typeof user?.role === 'object' && user.role !== null
    ? String(user.role.name || '').toUpperCase()
    : String(user?.role || '').toUpperCase();

  const canApprove = ['ADMIN', 'STAFF', 'PIMPINAN', 'LEADER'].includes(roleName);

  // Fetch Attendance data on mount
  useEffect(() => {
    // Check if there is a saved token in localStorage to prevent early logout during hydration
    const savedAuthStr = typeof window !== 'undefined' ? localStorage.getItem('ppsu-auth-storage') : null;
    let hasSavedToken = false;
    if (savedAuthStr) {
      try {
        const savedAuth = JSON.parse(savedAuthStr);
        if (savedAuth?.state?.token) {
          hasSavedToken = true;
        }
      } catch (e) {
        console.error('Failed to parse saved auth storage:', e);
      }
    }

    if (!token && !hasSavedToken) {
      logout();
      router.push('/login');
      return;
    }

    if (token) {
      fetchAttendance();
    }
  }, [token]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const [attRes, schedRes] = await Promise.all([
        axios.get(`${apiUrl}/attendance/admin`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${apiUrl}/schedules`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error('Failed to load schedules, using empty array', err);
          return { data: [] };
        })
      ]);
      setAttendance(attRes.data || []);
      setSchedules(schedRes.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to load attendance:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        router.push('/login');
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        setError('Gagal terhubung ke server. Pastikan backend berjalan di port 3001.');
      } else {
        setError(`Gagal memuat riwayat absensi: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Real-time attendance updates via WebSocket
  useRealtimeEntity('attendance', () => {
    fetchAttendance();
  });

  const getScheduleForUser = (userId: number, timestamp: string) => {
    if (!timestamp || !userId || !schedules.length) return null;
    // Extract date in YYYY-MM-DD format
    const dateStr = timestamp.split('T')[0];
    
    return schedules.find(s => {
      const sDateStr = s.date ? s.date.split('T')[0] : '';
      if (sDateStr !== dateStr) return false;
      return s.assignedUsers?.some((u: any) => u.id === userId);
    });
  };

  // Handle Approve Izin
  const handleApproveIzin = async (id: number, isRequestTable?: boolean) => {
    if (!confirm('Apakah Anda yakin ingin menyetujui pengajuan ini?')) return;
    try {
      await axios.put(`${apiUrl}/attendance/${id}/status`, {
        status: 'APPROVED',
        rejectionReason: null,
        isRequestTable
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAttendance();
    } catch (err) {
      console.error('Failed to approve request:', err);
      alert('Gagal menyetujui pengajuan.');
    }
  };

  // Open Rejection Modal
  const openRejectionModal = (id: number, isRequestTable = false) => {
    setSelectedRejectionId(id);
    setSelectedRejectionIsRequestTable(isRequestTable);
    setRejectionReasonText('');
  };

  // Handle Reject Izin
  const handleRejectIzin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReasonText.trim()) {
      alert('Silakan masukkan alasan penolakan.');
      return;
    }
    if (!selectedRejectionId) return;

    try {
      setSubmittingRejection(true);
      await axios.put(`${apiUrl}/attendance/${selectedRejectionId}/status`, {
        status: 'REJECTED',
        rejectionReason: rejectionReasonText,
        isRequestTable: selectedRejectionIsRequestTable
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedRejectionId(null);
      fetchAttendance();
    } catch (err) {
      console.error('Failed to reject request:', err);
      alert('Gagal menolak pengajuan.');
    } finally {
      setSubmittingRejection(false);
    }
  };

  // Helper format time
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} WIB`;
  };

  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTimeOnly = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} WIB`;
  };

  // Helper to calculate work and break durations
  const calculateDurations = (records: any[]) => {
    if (!records || records.length === 0) return { workStr: '-', breakStr: '-' };
    
    // Find timestamps
    const inRec = records.find(r => r.type === 'IN');
    const breakRec = records.find(r => r.type === 'BREAK');
    const endBreakRec = records.find(r => r.type === 'END_BREAK');
    const outRec = records.find(r => r.type === 'OUT');
    
    let breakMs = 0;
    let breakStr = '-';
    
    // Calculate break duration
    if (breakRec) {
      const breakStart = new Date(breakRec.timestamp).getTime();
      const breakEnd = endBreakRec 
        ? new Date(endBreakRec.timestamp).getTime() 
        : (outRec ? new Date(outRec.timestamp).getTime() : new Date().getTime());
      
      if (breakEnd > breakStart) {
        breakMs = breakEnd - breakStart;
        const totalMinutes = Math.floor(breakMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours > 0) {
          breakStr = `${hours} Jam ${minutes} Menit`;
        } else {
          breakStr = `${minutes} Menit`;
        }
      }
    }
    
    let workStr = '-';
    // Calculate work duration
    if (inRec) {
      const workStart = new Date(inRec.timestamp).getTime();
      const workEnd = outRec 
        ? new Date(outRec.timestamp).getTime() 
        : new Date(records[records.length - 1].timestamp).getTime();
      
      if (workEnd > workStart) {
        let workMs = workEnd - workStart - breakMs;
        if (workMs < 0) workMs = 0;
        
        const totalMinutes = Math.floor(workMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours > 0) {
          workStr = `${hours} Jam ${minutes} Menit`;
        } else {
          workStr = `${minutes} Menit`;
        }
      }
    }
    
    return { workStr, breakStr };
  };

  // Helper type parsing
  const getTypeText = (type: string) => {
    switch (type) {
      case 'IN': return 'Absen Masuk';
      case 'BREAK': return 'Mulai Istirahat';
      case 'END_BREAK': return 'Selesai Istirahat';
      case 'OUT': return 'Absen Pulang';
      case 'PERMIT': return 'Izin Tidak Masuk';
      case 'EARLY_OUT': return 'Izin Pulang Awal';
      default: return type;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'IN': return 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400';
      case 'BREAK': return 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400';
      case 'END_BREAK': return 'bg-sky-50 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400';
      case 'OUT': return 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400';
      case 'PERMIT': return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
      case 'EARLY_OUT': return 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400';
      default: return 'bg-zinc-50 text-zinc-500';
    }
  };

  // Master Filter & Search
  const filteredData = attendance.filter(item => {
    const matchesSearch = !search || (
      item.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      item.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
      item.address?.toLowerCase().includes(search.toLowerCase()) ||
      item.reason?.toLowerCase().includes(search.toLowerCase())
    );

    const getShortDate = (dStr: string) => dStr ? dStr.split('T')[0] : '';
    const itemDate = getShortDate(item.timestamp);
    const matchesDate = 
      (!filterStartDate || itemDate >= filterStartDate) && 
      (!filterEndDate || itemDate <= filterEndDate);

    return matchesSearch && matchesDate;
  });

  // Buckets
  const absensiLogs = filteredData.filter(item => 
    ['IN', 'BREAK', 'END_BREAK', 'OUT'].includes(item.type) && !item.isOutsideSchedule && !item.isLembur
  );

  const izinLogs = filteredData.filter(item => 
    ['PERMIT', 'EARLY_OUT'].includes(item.type)
  );

  const requestLogs = filteredData.filter(item => 
    item.type === 'IN' && item.isOutsideSchedule && !item.isLembur
  );

  const lemburLogs = filteredData.filter(item => 
    !!item.isLembur
  );

  // Helper to group records by user and date
  const getGroupedLogs = (logs: AttendanceItem[]) => {
    const groups: { [key: string]: AttendanceItem[] } = {};
    
    logs.forEach(item => {
      if (!item.user) return;
      const dateStr = item.timestamp ? item.timestamp.split('T')[0] : '';
      const key = `${item.user.id}_${dateStr}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // Map each group to a single representative item
    const grouped = Object.keys(groups).map(key => {
      const records = groups[key];
      // Sort records by timestamp ASC (IN -> BREAK -> END_BREAK -> OUT)
      records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      const firstRecord = records[0];
      const lastRecord = records[records.length - 1];
      
      // Check if any record has fake GPS
      const isMock = records.some(r => r.isMock);
      
      // Get the address
      const address = firstRecord.address || lastRecord.address;
      
      return {
        id: key, // Unique string ID
        user: firstRecord.user,
        dateStr: key.split('_')[1],
        records: records,
        type: lastRecord.type, // represent the current stage/type
        timestamp: firstRecord.timestamp, // check-in time
        lat: firstRecord.lat,
        lng: firstRecord.lng,
        address: address,
        photoUrl: firstRecord.photoUrl || lastRecord.photoUrl,
        isMock: isMock,
        isOutsideSchedule: firstRecord.isOutsideSchedule,
        isLembur: firstRecord.isLembur,
      };
    });

    // Sort grouped items by check-in timestamp DESC (latest days/users first)
    grouped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return grouped as any[];
  };

  const groupedAbsensiLogs = getGroupedLogs(absensiLogs);
  const groupedLemburLogs = getGroupedLogs(lemburLogs);

  // Badge counters
  const pendingIzinCount = attendance.filter(item => 
    ['PERMIT', 'EARLY_OUT'].includes(item.type) && item.status === 'PENDING'
  ).length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">Kelola Kehadiran Petugas</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Monitoring kehadiran terjadwal, pengajuan dispensasi/izin sakit, dan permintaan presensi luar jadwal.</p>
        </div>
        <Button 
          onClick={fetchAttendance}
          className="bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-700 rounded-2xl h-11 px-4 shadow-sm font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Segarkan
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/50">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Tabs list wrapper */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800 gap-1.5 p-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl max-w-2xl shadow-inner">
        {[
          { id: 'absensi', label: 'Absensi Petugas', icon: Users, count: 0 },
          { id: 'izin', label: 'Izin Absen', icon: FileText, count: pendingIzinCount },
          { id: 'request', label: 'Request Absensi', icon: Clock, count: requestLogs.filter(r => r.status === 'PENDING').length },
          { id: 'lembur', label: 'Absen Lembur', icon: Sparkles, count: 0 }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl transition-all duration-300 font-black text-xs relative ${
                isActive 
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <Badge className="bg-red-500 text-white font-black text-[9px] h-4.5 px-1.5 min-w-[18px] border-none flex items-center justify-center rounded-full scale-90">
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters Area */}
      <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
          
          {/* Search bar */}
          <div className="flex-1 flex flex-col gap-1 w-full">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Cari Nama / NIK / Wilayah</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input 
                placeholder="Cari kata kunci..." 
                className="pl-11 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 font-medium focus-visible:ring-orange-500 shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Date Picker filter Range */}
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
            <div className="flex flex-col gap-1 w-full md:w-40">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Tanggal Mulai</label>
              <Input 
                type="date"
                className="rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 font-medium focus-visible:ring-orange-500 shadow-sm text-zinc-650 dark:text-zinc-300"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 w-full md:w-40">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Tanggal Akhir</label>
              <Input 
                type="date"
                className="rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 font-medium focus-visible:ring-orange-500 shadow-sm text-zinc-650 dark:text-zinc-300"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
              />
            </div>
          </div>

          {(search || filterStartDate || filterEndDate) && (
            <Button
              variant="ghost"
              onClick={() => { setSearch(''); setFilterStartDate(''); setFilterEndDate(''); }}
              className="h-11 px-4 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold rounded-2xl shrink-0"
            >
              Reset
            </Button>
          )}

        </CardContent>
      </Card>

      {/* Main List Container */}
      <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden">
        <CardContent className="p-0">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-zinc-500 text-sm font-semibold">Memuat riwayat kehadiran...</p>
            </div>
          ) : (
            <>
              {/* Tab 1: Absensi Petugas */}
              {activeTab === 'absensi' && (
                groupedAbsensiLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300 px-6 py-4">Petugas</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Tipe</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Waktu</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Shift & Zona</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Lokasi</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">GPS Valid</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300 text-right px-6">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedAbsensiLogs.map((item) => {
                          const sched = getScheduleForUser(item.user?.id, item.timestamp);
                          const shiftName = sched ? sched.shiftName : (item.isOutsideSchedule ? 'Luar Jadwal' : '-');
                          const zoneName = sched ? (typeof sched.zone === 'object' ? sched.zone?.name : sched.zone) : '-';

                          return (
                            <TableRow key={item.id} className="border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20">
                              <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 flex-shrink-0">
                                    <img 
                                      src={item.user?.photoUrl || '/logodki.png'} 
                                      alt={item.user?.fullName} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                                    />
                                  </div>
                                  <div>
                                    <p className="font-black text-zinc-855 dark:text-zinc-200 text-xs">{item.user?.fullName || 'Petugas'}</p>
                                    <p className="text-[10px] font-bold text-zinc-400">@{item.user?.username || '-'}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {item.records.map((rec: any) => (
                                    <Badge 
                                      key={rec.id} 
                                      className={`border-none font-bold text-[9px] px-1.5 py-0.5 ${getTypeBadgeClass(rec.type)}`}
                                    >
                                      {getTypeText(rec.type)}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <span className="block font-black text-zinc-800 dark:text-zinc-205 text-xs">{formatDateOnly(item.timestamp)}</span>
                                  <span className="block text-[10px] text-zinc-400 font-bold">
                                    {formatTimeOnly(item.records[0].timestamp)}
                                    {item.records.length > 1 && ` - ${formatTimeOnly(item.records[item.records.length - 1].timestamp)}`}
                                  </span>
                                  {(() => {
                                    const { workStr, breakStr } = calculateDurations(item.records);
                                    return (
                                      <div className="mt-1 space-y-0.5">
                                        <div className="text-[9px] font-black uppercase tracking-wider text-emerald-650 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-1 py-0.2 rounded w-max">
                                          Masuk: {workStr}
                                        </div>
                                        {breakStr !== '-' && (
                                          <div className="text-[9px] font-black uppercase tracking-wider text-amber-650 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/20 px-1 py-0.2 rounded w-max">
                                            Istirahat: {breakStr}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <span className="block font-black text-zinc-800 dark:text-zinc-205 text-xs">{shiftName}</span>
                                  <span className="block text-[10px] text-zinc-450 font-bold">{zoneName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => setSelectedMapItem(item)}
                                  className="w-9 h-9 p-0 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-950/20 group transition-all"
                                  title="Lihat Lokasi Absen"
                                >
                                  <MapPin className="w-4 h-4 text-zinc-550 group-hover:text-orange-500 transition-colors" />
                                </Button>
                              </TableCell>
                              <TableCell>
                                {item.isMock ? (
                                  <Badge className="bg-red-50 text-red-600 border-none font-bold text-[9px]">Fake GPS ⚠️</Badge>
                                ) : (
                                  <Badge className="bg-green-50 text-green-600 border-none font-bold text-[9px]">Valid ✓</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right px-6">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button 
                                    size="sm"
                                    onClick={() => setSelectedDetailItem(item)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs h-8 px-3.5 transition-all transform active:scale-95 shadow-sm shadow-orange-500/10"
                                  >
                                    Detail
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center p-6">
                    <Users className="w-16 h-16 text-zinc-200 dark:text-zinc-800 mb-3" />
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Belum Ada Absensi Terjadwal</h3>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs max-w-sm mt-1">
                      Belum ada data absensi terjadwal yang tersimpan hari ini.
                    </p>
                  </div>
                )
              )}
              
              {/* Tab 2: Izin Absen */}
              {activeTab === 'izin' && (
                izinLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300 px-6 py-4">Petugas</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Jenis Izin</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Waktu Pengajuan</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Alasan Detail</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Status</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Lokasi</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300 text-right px-6">Tindakan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {izinLogs.map((item) => (
                          <TableRow key={item.id} className="border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20">
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 flex-shrink-0">
                                  <img 
                                    src={item.user?.photoUrl || '/logodki.png'} 
                                    alt={item.user?.fullName} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                                  />
                                </div>
                                <div>
                                  <p className="font-black text-zinc-850 dark:text-zinc-200 text-xs">{item.user?.fullName || 'Petugas'}</p>
                                  <p className="text-[10px] font-bold text-zinc-400">@{item.user?.username || '-'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`border-none font-bold text-[10px] px-2 py-0.5 ${getTypeBadgeClass(item.type)}`}>
                                {getTypeText(item.type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <span className="block font-black text-zinc-800 dark:text-zinc-205 text-xs">{formatDateOnly(item.timestamp)}</span>
                                <span className="block text-[10px] text-zinc-400 font-bold">{formatTimeOnly(item.timestamp)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                  {item.reason}
                                </p>
                                {item.rejectionReason && (
                                  <p className="text-[10px] font-black text-red-500 bg-red-50/60 dark:bg-red-950/20 px-2 py-0.5 rounded border border-red-100/30">
                                    Catatan Ditolak: {item.rejectionReason}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`border-none font-black text-[9px] ${
                                item.status === 'APPROVED' 
                                  ? 'bg-green-50 text-green-600 dark:bg-green-950/20' 
                                  : item.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-600 dark:bg-red-950/20'
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 animate-pulse'
                              }`}>
                                {item.status === 'APPROVED' ? 'Diterima' : item.status === 'REJECTED' ? 'Ditolak' : 'Tertunda'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                onClick={() => setSelectedMapItem(item)}
                                className="w-9 h-9 p-0 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-950/20 group transition-all"
                                title="Lihat Lokasi Pengajuan"
                              >
                                <MapPin className="w-4 h-4 text-zinc-550 group-hover:text-orange-500 transition-colors" />
                              </Button>
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.photoUrl ? (
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => setViewingPhoto(item.photoUrl)}
                                    className="w-9 h-9 p-0 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    title="Lihat Foto Selfie / Surat Sakit"
                                  >
                                    <Eye className="w-4 h-4 text-zinc-500" />
                                  </Button>
                                ) : (
                                  <span className="text-zinc-350 text-xs font-semibold mr-2">-</span>
                                )}
                                <Button 
                                  size="sm"
                                  onClick={() => setSelectedDetailItem(item)}
                                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs h-8 px-3.5 transition-all transform active:scale-95 shadow-sm shadow-orange-500/10 mr-1.5"
                                >
                                  Detail
                                </Button>
                                {item.status === 'PENDING' && canApprove ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleApproveIzin(item.id)}
                                      className="bg-emerald-600 hover:bg-blue-600 text-white rounded-xl font-bold text-xs h-8 px-3 transition-all transform active:scale-95 flex items-center gap-1 shadow-sm"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Setujui
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => openRejectionModal(item.id)}
                                      className="bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs h-8 px-3 transition-all transform active:scale-95 flex items-center gap-1 border border-red-100"
                                    >
                                      <Ban className="w-3.5 h-3.5" /> Tolak
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center p-6">
                    <FileText className="w-16 h-16 text-zinc-200 dark:text-zinc-800 mb-3" />
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Belum Ada Pengajuan Izin</h3>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs max-w-sm mt-1">
                      Belum ada data pengajuan izin masuk atau pulang awal untuk ditinjau.
                    </p>
                  </div>
                )
              )}

              {/* Tab 3: Request Absensi (Outside Schedule) */}
              {activeTab === 'request' && (
                requestLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300 px-6 py-4">Petugas</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Waktu Pengajuan</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Alasan Request</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Status</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">GPS</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Lokasi</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300 text-right px-6">Tindakan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requestLogs.map((item) => (
                          <TableRow key={item.id} className="border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20">
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 flex-shrink-0">
                                  <img 
                                    src={item.user?.photoUrl || '/logodki.png'} 
                                    alt={item.user?.fullName} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                                  />
                                </div>
                                <div>
                                  <p className="font-black text-zinc-850 dark:text-zinc-200 text-xs">{item.user?.fullName || 'Petugas'}</p>
                                  <p className="text-[10px] font-bold text-zinc-400">@{item.user?.username || '-'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <span className="block font-black text-zinc-800 dark:text-zinc-205 text-xs">{formatDateOnly(item.timestamp)}</span>
                                <span className="block text-[10px] text-zinc-400 font-bold">{formatTimeOnly(item.timestamp)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-zinc-750 dark:text-zinc-300 leading-relaxed">
                                  {item.reason || 'Permintaan Absen Masuk Luar Jadwal'}
                                </p>
                                {item.rejectionReason && (
                                  <p className="text-[10px] font-black text-red-500 bg-red-50/60 dark:bg-red-950/20 px-2 py-0.5 rounded border border-red-100/30">
                                    Catatan Ditolak: {item.rejectionReason}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`border-none font-black text-[9px] ${
                                item.status === 'APPROVED' 
                                  ? 'bg-green-50 text-green-600 dark:bg-green-950/20' 
                                  : item.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-600 dark:bg-red-950/20'
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 animate-pulse'
                              }`}>
                                {item.status === 'APPROVED' ? 'Diterima' : item.status === 'REJECTED' ? 'Ditolak' : 'Menunggu Diterima'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.isMock ? (
                                <Badge className="bg-red-50 text-red-600 border-none font-bold text-[9px]">Fake GPS ⚠️</Badge>
                              ) : (
                                <Badge className="bg-green-50 text-green-600 border-none font-bold text-[9px]">Valid ✓</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                onClick={() => setSelectedMapItem(item)}
                                className="w-9 h-9 p-0 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-950/20 group transition-all"
                                title="Lihat Lokasi Request"
                              >
                                <MapPin className="w-4 h-4 text-zinc-550 group-hover:text-orange-500 transition-colors" />
                              </Button>
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.photoUrl ? (
                                  <Button 
                                    variant="ghost" 
                                    onClick={() => setViewingPhoto(item.photoUrl)}
                                    className="w-9 h-9 p-0 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    title="Lihat Foto Selfie"
                                  >
                                    <Eye className="w-4 h-4 text-zinc-500" />
                                  </Button>
                                ) : (
                                  <span className="text-zinc-350 text-xs font-semibold mr-2">-</span>
                                )}
                                <Button 
                                  size="sm"
                                  onClick={() => setSelectedDetailItem(item)}
                                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs h-8 px-3.5 transition-all transform active:scale-95 shadow-sm shadow-orange-500/10 mr-1.5"
                                >
                                  Detail
                                </Button>
                                {item.status === 'PENDING' && canApprove ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleApproveIzin(item.id, true)}
                                      className="bg-emerald-600 hover:bg-blue-600 text-white rounded-xl font-bold text-xs h-8 px-3 transition-all transform active:scale-95 flex items-center gap-1 shadow-sm"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Setujui
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => openRejectionModal(item.id, true)}
                                      className="bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs h-8 px-3 transition-all transform active:scale-95 flex items-center gap-1 border border-red-100"
                                    >
                                      <Ban className="w-3.5 h-3.5" /> Tolak
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center p-6">
                    <Clock className="w-16 h-16 text-zinc-200 dark:text-zinc-800 mb-3" />
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Tidak Ada Request Luar Jadwal</h3>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs max-w-sm mt-1">
                      Seluruh presensi masuk hari ini sesuai dengan jadwal penugasan masing-masing petugas.
                    </p>
                  </div>
                )
              )}

              {/* Tab 4: Absen Lembur */}
              {activeTab === 'lembur' && (
                groupedLemburLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300 px-6 py-4">Petugas</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Tipe</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Waktu</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Shift & Zona</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Lokasi</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">GPS Valid</TableHead>
                          <TableHead className="font-bold text-zinc-700 dark:text-zinc-300 text-right px-6">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedLemburLogs.map((item) => {
                          const sched = getScheduleForUser(item.user?.id, item.timestamp);
                          const shiftName = 'Luar Jadwal (Lembur)';
                          const zoneName = sched ? (typeof sched.zone === 'object' ? sched.zone?.name : sched.zone) : 'Luar Wilayah';

                          return (
                            <TableRow key={item.id} className="border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20">
                              <TableCell className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 flex-shrink-0">
                                    <img 
                                      src={item.user?.photoUrl || '/logodki.png'} 
                                      alt={item.user?.fullName} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                                    />
                                  </div>
                                  <div>
                                    <p className="font-black text-zinc-850 dark:text-zinc-200 text-xs">{item.user?.fullName || 'Petugas'}</p>
                                    <p className="text-[10px] font-bold text-zinc-400">@{item.user?.username || '-'}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {item.records.map((rec: any) => (
                                    <Badge 
                                      key={rec.id} 
                                      className={`border-none font-bold text-[9px] px-1.5 py-0.5 ${getTypeBadgeClass(rec.type)}`}
                                    >
                                      {getTypeText(rec.type)} (Lembur)
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <span className="block font-black text-zinc-800 dark:text-zinc-205 text-xs">{formatDateOnly(item.timestamp)}</span>
                                  <span className="block text-[10px] text-zinc-400 font-bold">
                                    {formatTimeOnly(item.records[0].timestamp)}
                                    {item.records.length > 1 && ` - ${formatTimeOnly(item.records[item.records.length - 1].timestamp)}`}
                                  </span>
                                  {(() => {
                                    const { workStr, breakStr } = calculateDurations(item.records);
                                    return (
                                      <div className="mt-1 space-y-0.5">
                                        <div className="text-[9px] font-black uppercase tracking-wider text-emerald-650 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-1 py-0.2 rounded w-max">
                                          Masuk: {workStr}
                                        </div>
                                        {breakStr !== '-' && (
                                          <div className="text-[9px] font-black uppercase tracking-wider text-amber-650 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/20 px-1 py-0.2 rounded w-max">
                                            Istirahat: {breakStr}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <span className="block font-black text-zinc-800 dark:text-zinc-205 text-xs">{shiftName}</span>
                                  <span className="block text-[10px] text-zinc-450 font-bold">{zoneName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => setSelectedMapItem(item)}
                                  className="w-9 h-9 p-0 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-orange-50 dark:hover:bg-orange-950/20 group transition-all"
                                  title="Lihat Lokasi Absen"
                                >
                                  <MapPin className="w-4 h-4 text-zinc-550 group-hover:text-orange-500 transition-colors" />
                                </Button>
                              </TableCell>
                              <TableCell>
                                {item.isMock ? (
                                  <Badge className="bg-red-50 text-red-600 border-none font-bold text-[9px]">Fake GPS ⚠️</Badge>
                                ) : (
                                  <Badge className="bg-green-50 text-green-600 border-none font-bold text-[9px]">Valid ✓</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right px-6">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button 
                                    size="sm"
                                    onClick={() => setSelectedDetailItem(item)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs h-8 px-3.5 transition-all transform active:scale-95 shadow-sm shadow-orange-500/10"
                                  >
                                    Detail
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center p-6">
                    <Sparkles className="w-16 h-16 text-zinc-200 dark:text-zinc-800 mb-3 animate-pulse text-amber-500" />
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Belum Ada Absen Lembur</h3>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs max-w-sm mt-1">
                      Belum ada data absensi lembur atau luar jadwal yang tersimpan hari ini.
                    </p>
                  </div>
                )
              )}
            </>
          )}

        </CardContent>
      </Card>

      {/* Full-size Selfie/Document Viewer Overlay */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl p-4 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setViewingPhoto(null)}
              className="absolute top-6 right-6 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full h-96 bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden relative">
              <img 
                src={viewingPhoto} 
                alt="Selfie / Lampiran" 
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-wider mt-4">Lampiran Foto Absensi / Surat Dokter</p>
          </div>
        </div>
      )}

      {/* Rejection Form Dialog Modal */}
      {selectedRejectionId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                {selectedRejectionIsRequestTable ? 'Alasan Penolakan Request' : 'Alasan Penolakan Izin'}
              </h3>
              <button 
                onClick={() => setSelectedRejectionId(null)}
                className="text-zinc-400 hover:text-zinc-650 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleRejectIzin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tulis Alasan Penolakan</label>
                <textarea
                  required
                  rows={4}
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  placeholder={selectedRejectionIsRequestTable ? 'Contoh: Alasan request masuk kurang valid / di luar area kerja.' : 'Contoh: Bukti surat dokter kurang jelas / tidak terlampir.'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={submittingRejection}
                  className="flex-1 py-5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs"
                >
                  {submittingRejection ? 'Mengirim...' : (selectedRejectionIsRequestTable ? 'Tolak Request' : 'Tolak Perizinan')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setSelectedRejectionId(null)}
                  className="flex-1 py-5 border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-xs"
                >
                  Batal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {selectedMapItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 p-6">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-orange-500" />
                <div>
                  <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wide">
                    Peta Lokasi Absensi
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-400">
                    Petugas: {selectedMapItem.user?.fullName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMapItem(null)}
                className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-850 text-zinc-450 hover:text-zinc-650 flex items-center justify-center transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="w-full h-64 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 relative z-0">
                <MapComponent 
                  center={[Number(selectedMapItem.lat) || -6.229728, Number(selectedMapItem.lng) || 106.747136]} 
                  zoom={15}
                  points={[{
                    lat: Number(selectedMapItem.lat) || -6.229728,
                    lng: Number(selectedMapItem.lng) || 106.747136,
                    name: selectedMapItem.user?.fullName || 'Petugas',
                    status: getTypeText(selectedMapItem.type)
                  }]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100/60 dark:border-zinc-800/50">
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Latitude</span>
                  <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{Number(selectedMapItem.lat).toFixed(6)}</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100/60 dark:border-zinc-800/50">
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Longitude</span>
                  <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{Number(selectedMapItem.lng).toFixed(6)}</span>
                </div>
              </div>

              <div className="p-4 bg-orange-50/50 dark:bg-orange-950/10 rounded-2xl border border-orange-100/30 dark:border-orange-900/20 text-xs">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block text-[9px] font-bold text-orange-650 dark:text-orange-400 uppercase tracking-wider">Alamat Lengkap</span>
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300 leading-normal">
                      {selectedMapItem.address}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 flex justify-end">
              <Button 
                onClick={() => setSelectedMapItem(null)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-xs h-10 px-6"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetailItem && (() => {
        const sched = getScheduleForUser(selectedDetailItem.user?.id, selectedDetailItem.timestamp);
        const shiftName = sched ? sched.shiftName : (selectedDetailItem.isOutsideSchedule ? 'Luar Jadwal' : '-');
        const zoneName = sched ? (typeof sched.zone === 'object' ? sched.zone?.name : sched.zone) : '-';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
            <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 p-6 bg-gradient-to-r from-orange-500/5 to-orange-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-100 border-2 border-white shadow">
                    <img 
                      src={selectedDetailItem.user?.photoUrl || '/logodki.png'} 
                      alt={selectedDetailItem.user?.fullName} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wide leading-none mb-1">
                      Detail Presensi Petugas
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-400 leading-none">
                      @{selectedDetailItem.user?.username} • ID: #{selectedDetailItem.id}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDetailItem(null)}
                  className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 text-zinc-400 hover:text-zinc-650 flex items-center justify-center shadow-sm"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {selectedDetailItem.records ? (
                  // Grouped Timeline Layout
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-3 dark:border-zinc-800">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Garis Waktu Kehadiran ({formatDateOnly(selectedDetailItem.timestamp)})</h4>
                      <Badge className="bg-orange-50 text-orange-600 border-none font-bold text-[9px] px-2 py-0.5">
                        {selectedDetailItem.records.length} Aktivitas
                      </Badge>
                    </div>
                    
                    {/* Premium Duration Summary Panel */}
                    {(() => {
                      const { workStr, breakStr } = calculateDurations(selectedDetailItem.records);
                      return (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150/40 dark:border-zinc-800 shadow-inner">
                          <div className="space-y-1">
                            <span className="block text-[9px] font-black text-zinc-450 uppercase tracking-wider">Durasi Masuk (Kerja Net)</span>
                            <p className="text-xs font-black text-emerald-650 dark:text-emerald-400 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              {workStr}
                            </p>
                          </div>
                          <div className="space-y-1 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                            <span className="block text-[9px] font-black text-zinc-450 uppercase tracking-wider">Durasi Istirahat</span>
                            <p className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              {breakStr}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div className="relative border-l-2 border-zinc-100 dark:border-zinc-800 ml-3 pl-5 space-y-5">
                      {selectedDetailItem.records.map((rec: any, idx: number) => (
                        <div key={rec.id} className="relative">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full border border-white dark:border-zinc-900 shadow-sm ${
                            rec.type === 'IN' 
                              ? 'bg-green-500' 
                              : rec.type === 'OUT' 
                              ? 'bg-purple-500' 
                              : 'bg-amber-500'
                          }`} />
                          
                          <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-100/50 dark:border-zinc-800/40 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <Badge className={`border-none font-bold text-[9px] px-2 py-0.5 ${getTypeBadgeClass(rec.type)}`}>
                                {getTypeText(rec.type)} {rec.isLembur ? '(Lembur)' : ''}
                              </Badge>
                              <span className="font-mono text-[10px] font-black text-zinc-400">
                                {formatTimeOnly(rec.timestamp)}
                              </span>
                            </div>
                            
                            <div className="space-y-1 text-xs">
                              <div className="flex items-start gap-1.5 leading-relaxed text-zinc-650 dark:text-zinc-350">
                                <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-zinc-700 dark:text-zinc-350">
                                    {rec.address || 'Alamat tidak terdeteksi'}
                                  </p>
                                  <p className="text-[9px] font-bold text-zinc-400 font-mono">
                                    GPS: {Number(rec.lat).toFixed(6)}, {Number(rec.lng).toFixed(6)} • 
                                    {rec.isMock ? (
                                      <span className="text-red-500 ml-1">Fake GPS ⚠️</span>
                                    ) : (
                                      <span className="text-green-500 ml-1">Valid ✓</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {rec.photoUrl ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Selfie Photo Wrapper */}
                                <div 
                                  onClick={() => setViewingPhoto(rec.photoUrl)}
                                  className="relative w-full h-32 bg-zinc-950 dark:bg-black rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 cursor-pointer group shadow-sm transition-all transform active:scale-98"
                                  title="Klik untuk memperbesar foto selfie"
                                >
                                  <img 
                                    src={rec.photoUrl} 
                                    alt={`Selfie ${getTypeText(rec.type)}`} 
                                    className="w-full h-full object-contain group-hover:scale-105 transition-all duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-all duration-200">
                                    <Eye className="w-5 h-5 text-white animate-bounce" />
                                    <span className="text-[9px] font-black text-white uppercase tracking-wider">Perbesar Foto</span>
                                  </div>
                                </div>

                                {/* Mini Map Wrapper */}
                                <div 
                                  onClick={() => setSelectedMapItem(rec)}
                                  className="relative w-full h-32 bg-zinc-100 dark:bg-zinc-950 rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 cursor-pointer group shadow-sm transition-all transform active:scale-98"
                                  title="Klik untuk memperbesar peta lokasi"
                                >
                                  <div className="w-full h-full pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
                                    <MapComponent 
                                      center={[Number(rec.lat) || -6.229728, Number(rec.lng) || 106.747136]} 
                                      zoom={14}
                                      showPopup={false}
                                      points={[{
                                        lat: Number(rec.lat) || -6.229728,
                                        lng: Number(rec.lng) || 106.747136,
                                        name: rec.user?.fullName || 'Petugas',
                                        status: getTypeText(rec.type)
                                      }]}
                                    />
                                  </div>
                                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/30 flex flex-col items-center justify-center gap-1 transition-all duration-200">
                                    <div className="w-8 h-8 rounded-full bg-white/95 dark:bg-zinc-900/95 flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform">
                                      <MapPin className="w-4.5 h-4.5 text-orange-500" />
                                    </div>
                                    <span className="text-[9px] font-black text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Perbesar Peta</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // Fallback if there is no photo, show only mini map spanning full-width
                              <div 
                                onClick={() => setSelectedMapItem(rec)}
                                className="relative w-full h-32 bg-zinc-100 dark:bg-zinc-950 rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 cursor-pointer group shadow-sm transition-all transform active:scale-98"
                                title="Klik untuk memperbesar peta lokasi"
                              >
                                <div className="w-full h-full pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
                                  <MapComponent 
                                    center={[Number(rec.lat) || -6.229728, Number(rec.lng) || 106.747136]} 
                                    zoom={14}
                                    showPopup={false}
                                    points={[{
                                      lat: Number(rec.lat) || -6.229728,
                                      lng: Number(rec.lng) || 106.747136,
                                      name: rec.user?.fullName || 'Petugas',
                                      status: getTypeText(rec.type)
                                    }]}
                                  />
                                </div>
                                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/30 flex flex-col items-center justify-center gap-1 transition-all duration-200">
                                  <div className="w-8 h-8 rounded-full bg-white/95 dark:bg-zinc-900/95 flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform">
                                    <MapPin className="w-4.5 h-4.5 text-orange-500" />
                                  </div>
                                  <span className="text-[9px] font-black text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Perbesar Peta</span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400">
                              <span className="truncate max-w-[150px]">{rec.deviceInfo || 'Chrome / Next.js WebApp'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Regular layout for single permit/reason items
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column: Basic Info */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b pb-1">Informasi Utama</h4>
                        
                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase">Nama Lengkap</span>
                          <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">{selectedDetailItem.user?.fullName}</p>
                        </div>

                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase">Tipe Presensi</span>
                          <div>
                            <Badge className={`border-none font-bold text-[10px] px-2 py-0.5 ${getTypeBadgeClass(selectedDetailItem.type)}`}>
                              {getTypeText(selectedDetailItem.type)}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase">Waktu Absensi</span>
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            {formatDateTime(selectedDetailItem.timestamp)}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase">Shift & Zona</span>
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            {shiftName} / {zoneName}
                          </p>
                        </div>
                      </div>

                      {/* Right Column: Device & Security */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b pb-1">Lokasi & Keamanan</h4>
                        
                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase">Status GPS</span>
                          <div>
                            {selectedDetailItem.isMock ? (
                              <Badge className="bg-red-50 text-red-600 border-none font-bold text-[9px]">Palsu / Fake GPS ⚠️</Badge>
                            ) : (
                              <Badge className="bg-green-50 text-green-600 border-none font-bold text-[9px]">Valid / Aman ✓</Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase">Koordinat GPS</span>
                          <p className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                            {Number(selectedDetailItem.lat).toFixed(6)}, {Number(selectedDetailItem.lng).toFixed(6)}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold text-zinc-400 uppercase">Verifikasi Browser/Device</span>
                          <div className="flex items-center gap-1 text-xs text-zinc-650 dark:text-zinc-350">
                            <Smartphone className="w-3.5 h-3.5 text-zinc-450" />
                            <span className="font-semibold text-[11px] truncate max-w-[180px]" title={selectedDetailItem.deviceInfo || 'Chrome / Next.js WebApp'}>
                              {selectedDetailItem.deviceInfo || 'Chrome / Next.js WebApp'}
                            </span>
                          </div>
                        </div>

                        {selectedDetailItem.status && (
                          <div className="space-y-1">
                            <span className="block text-[9px] font-bold text-zinc-400 uppercase">Status Pengajuan</span>
                            <div>
                              <Badge className={`border-none font-black text-[9px] ${
                                selectedDetailItem.status === 'APPROVED' 
                                  ? 'bg-green-50 text-green-600 dark:bg-green-950/20' 
                                  : selectedDetailItem.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-600 dark:bg-red-950/20'
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 animate-pulse'
                              }`}>
                                {selectedDetailItem.status === 'APPROVED' ? 'Diterima' : selectedDetailItem.status === 'REJECTED' ? 'Ditolak' : 'Tertunda / Menunggu'}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reason Details */}
                    {selectedDetailItem.reason && (
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150/40 dark:border-zinc-800 text-xs">
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Keterangan / Alasan</span>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {selectedDetailItem.reason}
                        </p>
                      </div>
                    )}

                    {selectedDetailItem.rejectionReason && (
                      <div className="p-4 bg-red-50/40 dark:bg-red-950/10 rounded-2xl border border-red-100/30 dark:border-red-900/20 text-xs">
                        <span className="block text-[9px] font-bold text-red-500 uppercase tracking-wider mb-1">Catatan Penolakan Admin</span>
                        <p className="font-semibold text-red-600 dark:text-red-400 leading-relaxed">
                          {selectedDetailItem.rejectionReason}
                        </p>
                      </div>
                    )}

                    {/* Full Address */}
                    <div className="p-4 bg-orange-50/30 dark:bg-orange-950/5 rounded-2xl border border-orange-100/20 dark:border-orange-900/10 text-xs">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold text-orange-650 dark:text-orange-400 uppercase tracking-wider">Alamat Saat Presensi</span>
                          <p className="font-semibold text-zinc-700 dark:text-zinc-300 leading-normal">
                            {selectedDetailItem.address}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Selfie / Attachment Image */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b pb-1">Lampiran Foto Selfie / Dokumen</h4>
                      {selectedDetailItem.photoUrl ? (
                        <div className="w-full h-48 bg-zinc-50 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 relative">
                          <img 
                            src={selectedDetailItem.photoUrl} 
                            alt="Foto Selfie / Lampiran" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                          <Info className="w-8 h-8 text-zinc-300 mb-2" />
                          <p className="text-zinc-400 dark:text-zinc-500 text-xs font-semibold">Tidak ada lampiran foto selfie atau surat sakti.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 flex justify-end">
                <Button 
                  onClick={() => setSelectedDetailItem(null)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-xs h-10 px-6"
                >
                  Tutup Detail
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
