'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Loader2, 
  CalendarRange, 
  ClipboardList,
  Upload,
  ShieldAlert,
  FileText,
  Sparkles,
  X
} from 'lucide-react';

import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api-config';

export default function PpsuHomePage() {
  const { user, token, setAuth } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [attendanceStatus, setAttendanceStatus] = useState<string>('Belum Absen');
  const [hasApprovedRequest, setHasApprovedRequest] = useState<boolean>(false);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [allSchedules, setAllSchedules] = useState<any[]>([]);
  const [stats, setStats] = useState({
    absenMasuk: 0,
    tidakHadir: 0,
    izinCount: 0,
    totalTugas: 0,
    totalLaporan: 0,
    poinPerforma: 98,
  });

  const [todayIzinStatus, setTodayIzinStatus] = useState<string | null>(null);
  const [todayIzinType, setTodayIzinType] = useState<string | null>(null);

  const [isIzinModalOpen, setIsIzinModalOpen] = useState(false);
  const [izinType, setIzinType] = useState<'PERMIT' | 'EARLY_OUT'>('PERMIT');
  const [izinCategory, setIzinCategory] = useState('Sakit');
  const [izinReason, setIzinReason] = useState('');
  const [suratDokter, setSuratDokter] = useState<string | null>(null);
  const [isSubmittingIzin, setIsSubmittingIzin] = useState(false);

  // Unscheduled Check-in Request States
  const [isRequestAbsenModalOpen, setIsRequestAbsenModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [showSuccessRequestModal, setShowSuccessRequestModal] = useState(false);
  const [rejectedRequest, setRejectedRequest] = useState<any>(null);
  const [isRejectionDismissed, setIsRejectionDismissed] = useState<boolean>(false);

  const [serverTime, setServerTime] = useState<string>('');
  const [serverDate, setServerDate] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      
      // Format Time (WIB, Asia/Jakarta)
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta'
      }) + ' WIB';

      // Format Date (Asia/Jakarta)
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      
      const formatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      const parts = formatter.formatToParts(now);
      const dayVal = parts.find(p => p.type === 'day')?.value || '';
      const monthVal = parts.find(p => p.type === 'month')?.value || '';
      const yearVal = parts.find(p => p.type === 'year')?.value || '';
      
      const d = new Date(parseInt(yearVal), parseInt(monthVal) - 1, parseInt(dayVal));
      const dateStr = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

      setServerTime(timeStr);
      setServerDate(dateStr);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to get YYYY-MM-DD date string in local time
  const getLocalDateString = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return '';
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  };

  // Helper function to get current Jakarta local date string (YYYY-MM-DD)
  const getJakartaTodayString = () => {
    return getLocalDateString(new Date());
  };

  // Greeting helper
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 11) return 'Selamat Pagi';
    if (hours < 15) return 'Selamat Siang';
    if (hours < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Auto sync user details to update photoUrl / phone / zone etc in the local store
      try {
        const resUser = await axios.get(`${apiUrl}/users/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAuth(resUser.data, token!);
      } catch (err) {
        console.error('Failed to auto-sync user details on mount:', err);
      }
      
      // 1. Fetch Today's Attendance Status
      const resAtt = await axios.get(`${apiUrl}/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceStatus(resAtt.data.status || 'Belum Absen');
      setHasApprovedRequest(!!resAtt.data.hasApprovedRequest);
      setTodayIzinStatus(resAtt.data.izinStatus || null);
      setTodayIzinType(resAtt.data.izinType || null);
      
      // Get rejected request details
      if (resAtt.data.rejectedRequest) {
        setRejectedRequest(resAtt.data.rejectedRequest);
        const dismissed = localStorage.getItem(`dismissed-rejection-${resAtt.data.rejectedRequest.id}`) === 'true';
        setIsRejectionDismissed(dismissed);
      } else {
        setRejectedRequest(null);
      }

      // 2. Fetch Active Schedules
      const resSchedules = await axios.get(`${apiUrl}/schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mySchedules = (resSchedules.data || [])
        .map((s: any) => {
          let assignedUsers = s.assignedUsers;
          if (typeof assignedUsers === 'string') {
            try { assignedUsers = JSON.parse(assignedUsers); } catch { assignedUsers = []; }
          }
          if (!Array.isArray(assignedUsers)) assignedUsers = [];
          return { ...s, assignedUsers };
        })
        .filter((s: any) => s.assignedUsers.some((au: any) => au.id === user.id));
      setAllSchedules(mySchedules);

      // Match today's schedule
      const localTodayStr = getJakartaTodayString();
      const todaySched = mySchedules.find((s: any) => {
        const sDateStr = s.date ? getLocalDateString(s.date) : '';
        return sDateStr === localTodayStr;
      });
      setTodaySchedule(todaySched || null);

      // 3. Fetch All Attendance
      const resAllAtt = await axios.get(`${apiUrl}/attendance/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const myAttendance = Array.isArray(resAllAtt.data) ? resAllAtt.data : [];

      // Calculate Monthly Statistics (1st to last day of current month)
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Filter schedules of the current month
      const currentMonthSchedules = mySchedules.filter((s: any) => {
        const sDate = new Date(s.date);
        return sDate >= firstDayOfMonth && sDate <= lastDayOfMonth;
      });

      // Filter attendances of the current month
      const thisMonthAttendance = myAttendance.filter((a: any) => {
        const aDate = new Date(a.timestamp);
        return aDate >= firstDayOfMonth && aDate <= lastDayOfMonth;
      });

      // Total Masuk (Monthly): Unique check-in days inside current month
      const hadirCount = thisMonthAttendance.filter((a: any) => a.type === 'IN').length;

      // Total Izin (Monthly): Unique check-in days inside current month that are permissions
      const monthlyIzinCount = thisMonthAttendance.filter((a: any) => a.type === 'PERMIT' || a.type === 'EARLY_OUT').length;

      // Total Tidak Masuk (Monthly): Scheduled days in past of this month with no check-in
      const pastMonthSchedules = currentMonthSchedules.filter((s: any) => {
        const sDateStr = s.date ? getLocalDateString(s.date) : '';
        return sDateStr < localTodayStr;
      });
      
      let absentCount = 0;
      pastMonthSchedules.forEach((ps: any) => {
        const psDateStr = ps.date ? getLocalDateString(ps.date) : '';
        const hadAtt = thisMonthAttendance.some((a: any) => {
          const aDateStr = a.timestamp ? getLocalDateString(a.timestamp) : '';
          return aDateStr === psDateStr && (a.type === 'IN' || a.type === 'PERMIT');
        });
        if (!hadAtt) absentCount++;
      });

      // 4. Fetch Tasks Count (Filtered Monthly)
      const resTasks = await axios.get(`${apiUrl}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userTasks = resTasks.data || [];
      const thisMonthTasks = userTasks.filter((t: any) => {
        const tDate = new Date(t.createdAt);
        return tDate >= firstDayOfMonth && tDate <= lastDayOfMonth;
      });
      const totalTugasCount = thisMonthTasks.length;

      // 5. Fetch Reports Count (Filtered Monthly)
      let reportsCount = 0;
      try {
        const resReports = await axios.get(`${apiUrl}/reports`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allReports = resReports.data || [];
        const userReports = allReports.filter((r: any) => r.user?.id === user.id);
        const thisMonthReports = userReports.filter((r: any) => {
          const rDate = new Date(r.createdAt);
          return rDate >= firstDayOfMonth && rDate <= lastDayOfMonth;
        });
        reportsCount = thisMonthReports.length;
      } catch (err) {
        console.error('Failed to fetch reports for counting:', err);
      }

      setStats({
        absenMasuk: hadirCount,
        tidakHadir: absentCount,
        izinCount: monthlyIzinCount,
        totalTugas: totalTugasCount,
        totalLaporan: reportsCount,
        poinPerforma: 98,
      });

    } catch (error) {
      console.error('Error fetching PPSU dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenIzinModal = (type: 'PERMIT' | 'EARLY_OUT') => {
    setIzinType(type);
    setIzinCategory('Sakit');
    setIzinReason('');
    setSuratDokter(null);
    setIsIzinModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsSubmittingIzin(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'izin'); // Set type to izin
        const uploadRes = await axios.post(`${apiUrl}/upload`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (uploadRes.data.success) {
          setSuratDokter(uploadRes.data.url);
        }
      } catch (err) {
        console.error('Error uploading file:', err);
        alert('Gagal mengupload file');
      } finally {
        setIsSubmittingIzin(false);
      }
    }
  };

  const handleSubmitIzin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!izinReason.trim()) {
      alert('Silakan masukkan alasan izin Anda.');
      return;
    }

    setIsSubmittingIzin(true);

    let lat = 0;
    let lng = 0;
    try {
      const pos: any = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 3000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (err) {
      console.log('Location not shared for permission', err);
    }

    try {
      const endpoint = izinType === 'PERMIT' ? 'permit' : 'early-out';
      await axios.post(
        `${apiUrl}/attendance/${endpoint}`,
        {
          lat,
          lng,
          address: izinType === 'PERMIT' ? 'Izin Tidak Masuk' : 'Izin Pulang Awal',
          photoUrl: suratDokter,
          reason: `Kategori: ${izinCategory} | Alasan: ${izinReason}`,
          clientTimestamp: new Date().toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsIzinModalOpen(false);
      alert('Pengajuan izin Anda berhasil disimpan.');
      fetchData(); // Refresh today's attendance status
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal mengirimkan pengajuan izin.');
    } finally {
      setIsSubmittingIzin(false);
    }
  };

  const handleSubmitRequestAbsen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) {
      alert('Silakan masukkan alasan permintaan absen masuk.');
      return;
    }

    setIsSubmittingRequest(true);

    let lat = -6.229728;
    let lng = 106.747136;
    try {
      const pos: any = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (err) {
      console.log('Location not shared for unscheduled request', err);
    }

    let resolvedAddress = 'Jl. Ciledug Raya, Petukangan Utara, Kebayoran Lama, Jakarta Selatan';
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8' }
      });
      const data = await response.json();
      if (data.display_name) {
        resolvedAddress = data.display_name;
      } else {
        resolvedAddress = `Lokasi: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    } catch (error) {
      console.warn('Reverse geocoding failed for request, using fallback:', error);
    }

    try {
      await axios.post(
        `${apiUrl}/attendance/check-in`,
        {
          lat,
          lng,
          address: resolvedAddress,
          photoUrl: null,
          reason: requestReason,
          clientTimestamp: Date.now()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsRequestAbsenModalOpen(false);
      setRequestReason('');
      setShowSuccessRequestModal(true);
      fetchData(); // Refresh today's attendance status
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal mengirimkan permintaan absen masuk.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleDismissRejection = () => {
    if (rejectedRequest) {
      localStorage.setItem(`dismissed-rejection-${rejectedRequest.id}`, 'true');
      setIsRejectionDismissed(true);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Tunggu sedikit agar zustand-persist di mobile selesai membaca memori
    const checkAuthAndFetch = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const currentState = useAuthStore.getState();
      if (!currentState.token || !currentState.user) {
        router.push('/login');
      } else {
        fetchData();
      }
    };

    checkAuthAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Realtime updates for attendance, tasks, and reports
  useRealtime((event) => {
    if (event.entity === 'attendance' || event.entity === 'task' || event.entity === 'report') {
      fetchData();
    }
  }, ['attendance', 'task', 'report']);

  // Generate Current Week's Schedules (Monday to Sunday)
  const getWeekSchedules = () => {
    const current = new Date();
    const currentDay = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diffToMonday = current.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    
    const weekDays = [];
    const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthsIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    for (let i = 0; i < 7; i++) {
      // Create date as local time only
      const nextDate = new Date(
        current.getFullYear(), 
        current.getMonth(), 
        diffToMonday + i
      );
      
      // Get local date string (YYYY-MM-DD)
      const dateStr = [
        nextDate.getFullYear(),
        String(nextDate.getMonth() + 1).padStart(2, '0'),
        String(nextDate.getDate()).padStart(2, '0')
      ].join('-');
      
      const matchedSched = allSchedules.find((s: any) => {
        const sDateStr = s.date ? s.date.split('T')[0] : '';
        return sDateStr === dateStr;
      });

      weekDays.push({
        dateStr,
        dayName: daysIndo[nextDate.getDay()],
        formattedDate: `${nextDate.getDate()} ${monthsIndo[nextDate.getMonth()]}`,
        schedule: matchedSched || null
      });
    }

    return weekDays;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-zinc-500 text-sm font-semibold">Memuat dashboard petugas...</p>
      </div>
    );
  }

  const shiftText = todaySchedule 
    ? `${todaySchedule.shiftName} (${todaySchedule.timeRange?.split(' - ')[0] || ''} WIB)`
    : 'Libur';

  const zoneText = todaySchedule
    ? (typeof todaySchedule.zone === 'object' ? todaySchedule.zone?.name : todaySchedule.zone)
    : '-';

  const weekSchedules = getWeekSchedules();

  const getCardTheme = (status: string, izinStatus: string | null) => {
    if (izinStatus === 'PENDING') {
      return {
        cardBg: 'bg-gradient-to-br from-zinc-400 to-zinc-600',
        btnText: 'text-zinc-500'
      };
    }
    if (izinStatus === 'APPROVED') {
      return {
        cardBg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
        btnText: 'text-yellow-700'
      };
    }
    switch (status) {
      case 'Belum Absen':
        return {
          cardBg: 'bg-gradient-to-br from-red-500 to-rose-600',
          btnText: 'text-rose-600'
        };
      case 'Sudah Absen':
      case 'Selesai Istirahat':
        return {
          cardBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
          btnText: 'text-blue-600'
        };
      case 'Absen Istirahat':
        return {
          cardBg: 'bg-gradient-to-br from-amber-400 to-amber-500',
          btnText: 'text-amber-700'
        };
      case 'Izin Tidak Masuk':
        return {
          cardBg: 'bg-gradient-to-br from-zinc-550 to-zinc-700',
          btnText: 'text-zinc-700'
        };
      case 'Pulang Awal':
        return {
          cardBg: 'bg-gradient-to-br from-orange-500 to-amber-600',
          btnText: 'text-orange-600'
        };
      case 'Sudah Absen Pulang':
      case 'Sudah Check-Out':
      case 'Sudah Checkout':
        return {
          cardBg: 'bg-gradient-to-br from-purple-400 to-indigo-500',
          btnText: 'text-indigo-655'
        };
      default:
        return {
          cardBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
          btnText: 'text-emerald-600'
        };
    }
  };

  const cardTheme = getCardTheme(attendanceStatus, todayIzinStatus);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section in Premium Card View */}
      <Card 
        className="border-none shadow-sm rounded-3xl overflow-hidden relative"
        style={{ 
          backgroundImage: "url('/gambar/bgheaderppsu.jpg')", 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        }}
      >
        <div className="absolute inset-0 bg-white/75 dark:bg-zinc-950/80 backdrop-blur-[1px] pointer-events-none" />
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 relative z-10">
          
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Profile Photo */}
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-855 flex items-center justify-center flex-shrink-0 border border-zinc-100 dark:border-zinc-800 shadow-inner">
              {user?.photoUrl ? (
                <img 
                  src={user.photoUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = user.photoUrl; // Fallback direct base64
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-black text-lg">
                  {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'PS'}
                </div>
              )}
            </div>

            {/* User Text Details */}
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">{getGreeting()},</p>
              <h2 className="text-base font-black text-zinc-800 dark:text-white leading-tight">
                {user?.fullName || 'Petugas PPSU'} 👋
              </h2>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase">ID Petugas:</span>
                <Badge className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-500 hover:bg-orange-50 border-none font-black text-[10px] px-2 py-0">
                  {user?.username || '-'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right Side: Running Server Clock & Date */}
          <div className="text-left sm:text-right space-y-0.5 sm:flex-shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/40 dark:border-zinc-800/40">
            <p className="text-[9px] font-bold text-zinc-850 dark:text-zinc-200 uppercase tracking-wider">
              {serverDate || 'Memuat Tanggal...'}
            </p>
            <p className="text-sm font-black text-orange-600 dark:text-orange-500 tabular-nums">
              {serverTime || '00:00:00 WIB'}
            </p>
            <div className="flex items-center gap-1 justify-start sm:justify-end">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Server Time</span>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Rejected Request Warning Card */}
      {rejectedRequest && !isRejectionDismissed && (
        <Card className="border-none bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-3xl overflow-hidden relative p-4 space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="absolute top-4 right-4 flex items-center justify-center">
            <button 
              onClick={handleDismissRejection}
              className="w-6 h-6 rounded-full bg-red-500/15 text-red-600 hover:bg-red-500/30 flex items-center justify-center transition-all"
              title="Tutup Pemberitahuan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1 pr-6 text-left">
              <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
                Pengajuan Absen Ditolak ⚠️
              </span>
              <p className="text-xs font-black text-zinc-800 dark:text-white leading-tight">
                Permintaan Absen Masuk Luar Jadwal Anda telah ditolak oleh Admin.
              </p>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100/30 dark:border-red-900/20 rounded-2xl text-xs space-y-1">
                <span className="block text-[9px] font-bold text-red-500 uppercase tracking-wider">Alasan Penolakan:</span>
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 leading-normal">
                  "{rejectedRequest.rejectionReason || 'Alasan tidak dicantumkan oleh admin.'}"
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Attendance Summary Card */}
      <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
        <Card className={`border-none shadow-lg text-white rounded-2xl overflow-hidden relative ${cardTheme.cardBg}`}>
          {/* Subtle Decorative Background Circles */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none" />
          
          <CardContent className="p-4 relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Status Hari Ini</p>
                <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 border-none text-white backdrop-blur-md px-2 py-0.5 font-black text-[10px]">
                  {attendanceStatus}
                </Badge>
              </div>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <img src="/gambar/icon/calender.png" alt="Kalender" className="w-4.5 h-4.5 object-contain" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-white/80">
                  <Clock className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Shift Masuk</span>
                </div>
                <p className="text-sm font-black truncate">{shiftText}</p>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-white/80">
                  <MapPin className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Zona Kerja</span>
                </div>
                <p className="text-sm font-black truncate">{zoneText}</p>
              </div>
            </div>

            {attendanceStatus === 'Menunggu Diterima' ? (
              <Button disabled className="w-full mt-4 bg-white/20 text-white border border-white/25 rounded-2xl font-black py-5 text-sm cursor-not-allowed flex items-center justify-center gap-1.5 animate-pulse">
                <Clock className="w-4.5 h-4.5 text-white" />
                Permintaan Absen Masuk Sedang Ditinjau ⏳
              </Button>
            ) : ['Sudah Absen Pulang', 'Sudah Check-Out', 'Sudah Checkout'].includes(attendanceStatus) && !hasApprovedRequest ? (
              <div className="space-y-3 mt-4">
                <Button disabled className="w-full bg-white/20 text-white border border-white/25 rounded-2xl font-black py-5 text-sm cursor-not-allowed">
                  Tugas Hari Ini Selesai
                </Button>
                <Button 
                  onClick={() => setIsRequestAbsenModalOpen(true)}
                  className="w-full bg-white text-purple-600 hover:bg-zinc-100 rounded-2xl font-black py-5 text-sm shadow-md transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4.5 h-4.5 text-purple-500 animate-pulse" />
                  Permintaan Absen Masuk (Lembur)
                </Button>
              </div>
            ) : ['Izin Tidak Masuk', 'Pulang Awal'].includes(attendanceStatus) || todayIzinStatus ? (
              <Button disabled className={`w-full mt-4 border rounded-2xl font-black py-5 text-sm cursor-not-allowed flex items-center justify-center gap-1.5 ${
                todayIzinStatus === 'PENDING' 
                  ? 'bg-white/10 text-white/80 border-white/20 animate-pulse' 
                  : todayIzinStatus === 'APPROVED' 
                    ? 'bg-white/30 text-white border-white/40' 
                    : 'bg-white/20 text-white border-white/25'
              }`}>
                {todayIzinStatus === 'PENDING' ? (
                  <>
                    <Clock className="w-4.5 h-4.5" />
                    Status Izin Sedang Dalam Peninjauan Admin ⏳
                  </>
                ) : todayIzinStatus === 'APPROVED' ? (
                  <>
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    Izin Absen Anda Telah Diterima Admin ✅
                  </>
                ) : (
                  <>
                    {attendanceStatus === 'Izin Tidak Masuk' ? 'Hari Ini Izin Tidak Masuk' : 'Hari Ini Pulang Awal'}
                  </>
                )}
              </Button>
            ) : (
              <div className="flex gap-2.5 mt-4">
                {(!todaySchedule || shiftText === 'Libur') && !hasApprovedRequest ? (
                  <Button 
                    onClick={() => setIsRequestAbsenModalOpen(true)}
                    className="w-full bg-white text-orange-600 hover:bg-zinc-100 rounded-2xl font-black py-5 text-sm shadow-md transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4.5 h-4.5 text-orange-500 animate-pulse" />
                    Permintaan Absen Masuk (Luar Jadwal)
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => { window.location.href = hasApprovedRequest ? '/ppsu/attendance-lembur' : '/ppsu/attendance'; }}
                      className={`flex-[2.2] rounded-2xl font-black py-5 text-sm shadow-md transition-all duration-300 transform active:scale-95 ${
                        hasApprovedRequest 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : `bg-white hover:bg-zinc-100 ${cardTheme.btnText}`
                      }`}
                    >
                      {hasApprovedRequest ? (
                        attendanceStatus === 'Belum Absen' || ['Sudah Absen Pulang', 'Sudah Check-Out', 'Sudah Checkout'].includes(attendanceStatus)
                          ? 'Absen Masuk Lembur'
                          : attendanceStatus === 'Sudah Absen'
                          ? 'Mulai Istirahat'
                          : attendanceStatus === 'Absen Istirahat'
                          ? 'Selesai Istirahat'
                          : attendanceStatus === 'Selesai Istirahat'
                          ? 'Absen Pulang Lembur'
                          : 'Absen Masuk Lembur'
                      ) : (
                        <>
                          {attendanceStatus === 'Belum Absen' && 'Absen Masuk'}
                          {attendanceStatus === 'Sudah Absen' && 'Mulai Istirahat'}
                          {attendanceStatus === 'Absen Istirahat' && 'Selesai Istirahat'}
                          {attendanceStatus === 'Selesai Istirahat' && 'Absen Pulang'}
                          {(['Sudah Absen Pulang', 'Sudah Check-Out', 'Sudah Checkout'].includes(attendanceStatus)) && 'Absen Masuk'}
                        </>
                      )}
                    </Button>
                    {attendanceStatus === 'Belum Absen' ? (
                      <Button 
                        onClick={() => handleOpenIzinModal('PERMIT')}
                        className="flex-[1] bg-yellow-500 hover:bg-yellow-600 border border-yellow-400 text-white rounded-2xl font-black py-5 text-sm transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-1"
                      >
                        Izin
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleOpenIzinModal('EARLY_OUT')}
                        className="flex-[1.5] bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-2xl font-black py-5 text-sm transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-1"
                      >
                        Pulang Awal
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dynamic 3-Column Stats Grid (Calculated Monthly) */}
      <div className="space-y-3">
        {/* Row 1: Attendance Indicators */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Masuk', value: stats.absenMasuk, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' },
            { label: 'Total Tidak Masuk', value: stats.tidakHadir, icon: AlertTriangle, color: 'text-red-650', bg: 'bg-red-50 dark:bg-red-950/20' },
            { label: 'Total Izin', value: stats.izinCount, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
          ].map((stat, idx) => (
            <Card key={idx} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 transition-all hover:shadow-md">
              <CardContent className="p-3 flex flex-col items-center text-center space-y-1.5">
                <div className={`${stat.bg} p-2.5 rounded-xl`}>
                  {stat.icon === Calendar ? (
                    <img src="/gambar/icon/calender.png" alt="Kalender" className="w-5 h-5 object-contain" />
                  ) : (
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  )}
                </div>
                <div>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">{stat.value}</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider leading-tight">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Row 2: Operational Indicators */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Tugas', value: stats.totalTugas, icon: ClipboardList, color: 'text-orange-650', bg: 'bg-orange-50 dark:bg-orange-950/20' },
            { label: 'Total Laporan', value: stats.totalLaporan, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
            { label: 'Performa', value: `${stats.poinPerforma}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20' },
          ].map((stat, idx) => (
            <Card key={idx} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 transition-all hover:shadow-md">
              <CardContent className="p-3 flex flex-col items-center text-center space-y-1.5">
                <div className={`${stat.bg} p-2.5 rounded-xl`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">{stat.value}</p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider leading-tight">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Weekly Schedule Section (Table view) */}
      <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden w-full">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/gambar/icon/calender.png" alt="Jadwal" className="w-5 h-5 object-contain" />
              <h3 className="text-sm font-black text-zinc-800 dark:text-white">Jadwal Seminggu Ini</h3>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/ppsu/schedule')}
              className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-bold px-3 py-1.5 rounded-xl transition-all"
            >
              Lihat Jadwal
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  <th className="py-2.5 px-2">Hari & Tanggal</th>
                  <th className="py-2.5 px-2 text-center">Shift</th>
                  <th className="py-2.5 px-2 text-right">Zona Kerja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
                {weekSchedules.map((ws: any, idx: number) => {
                  const hasSched = !!ws.schedule;
                  const isToday = ws.dateStr === getJakartaTodayString();
                  
                  return (
                    <tr 
                      key={idx} 
                      className={`text-xs font-bold transition-colors ${
                        isToday ? 'bg-orange-50/40 dark:bg-orange-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-2 text-zinc-650 dark:text-zinc-300">
                        <span className="flex items-center gap-1.5">
                          {ws.dayName}
                          {isToday && (
                            <Badge className="bg-orange-500 text-white border-none font-bold text-[8px] px-1 py-0 rounded">
                              Hari Ini
                            </Badge>
                          )}
                        </span>
                        <span className="block text-[10px] font-bold text-zinc-400">{ws.formattedDate}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {hasSched ? (
                          <Badge className="bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-none font-black text-[9px] px-2 py-0.5">
                            {ws.schedule.shiftName}
                          </Badge>
                        ) : (
                          <span className="text-zinc-400 font-medium text-[11px]">Libur</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right text-zinc-700 dark:text-zinc-300">
                        {hasSched ? (
                          <span className="font-black">
                            {typeof ws.schedule.zone === 'object' ? ws.schedule.zone?.name : ws.schedule.zone}
                          </span>
                        ) : (
                          <span className="text-zinc-350 dark:text-zinc-650">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Premium Glassmorphic Izin & Pulang Awal Modal */}
      {isIzinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm overflow-hidden bg-white/95 dark:bg-zinc-950/95 border border-white/20 dark:border-zinc-800/80 rounded-3xl shadow-2xl p-6 space-y-4 transform scale-100 transition-all duration-300 text-left">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                <ShieldAlert className="w-4.5 h-4.5 text-orange-555" />
                {izinType === 'PERMIT' ? 'Form Izin Tidak Masuk' : 'Form Pulang Awal'}
              </h3>
              <button 
                onClick={() => setIsIzinModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmitIzin} className="space-y-4">
              
              {/* Category Choice Cards */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-850 dark:text-zinc-300 uppercase tracking-wider">
                  Pilih Alasan
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { val: 'Sakit', label: 'Sakit 🤒' },
                    { val: izinType === 'PERMIT' ? 'Izin Lainnya' : 'Lainnya', label: izinType === 'PERMIT' ? 'Izin Lainnya 📝' : 'Lainnya 📝' }
                  ].map((item) => {
                    const isSelected = izinCategory === item.val;
                    return (
                      <button
                        type="button"
                        key={item.val}
                        onClick={() => setIzinCategory(item.val)}
                        className={`py-3 px-3 rounded-xl border text-center transition-all active:scale-95 text-xs font-black flex flex-col items-center justify-center gap-1 ${
                          isSelected 
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20' 
                            : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textarea Reason */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-850 dark:text-zinc-300 uppercase tracking-wider">
                  Alasan Detail
                </label>
                <textarea
                  required
                  rows={3}
                  value={izinReason}
                  onChange={(e) => setIzinReason(e.target.value)}
                  placeholder="Masukkan alasan Anda secara jelas dan rinci..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 text-zinc-900 dark:text-white"
                />
              </div>

              {/* Optional Doctor's Note Upload (only if Sakit chosen) */}
              {izinCategory === 'Sakit' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-850 dark:text-zinc-300 uppercase tracking-wider">
                    Bukti Surat Dokter (Optional)
                  </label>
                  <label className="border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-orange-400 bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.98]">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                    {suratDokter ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <FileText className="w-5 h-5" />
                        <span className="text-[10px] font-bold truncate max-w-[200px]">Dokumen Terpilih</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                        <span className="text-[10px] font-bold text-zinc-500">Unggah Foto Surat Dokter</span>
                      </>
                    )}
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <Button 
                  type="submit"
                  disabled={isSubmittingIzin}
                  className="flex-1 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {isSubmittingIzin ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Kirim Pengajuan'
                  )}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setIsIzinModalOpen(false)}
                  className="flex-1 py-5 rounded-xl font-bold text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100"
                >
                  Batal
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Premium Request Absen Modal */}
      {isRequestAbsenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm overflow-hidden bg-white/95 dark:bg-zinc-950/95 border border-white/20 dark:border-zinc-800/80 rounded-3xl shadow-2xl p-6 space-y-4 transform scale-100 transition-all duration-300 text-left animate-in zoom-in-95 duration-155">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-orange-500 animate-pulse" />
                Permintaan Absen Masuk
              </h3>
              <button 
                onClick={() => setIsRequestAbsenModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmitRequestAbsen} className="space-y-4">
              
              {/* Textarea Reason */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-850 dark:text-zinc-300 uppercase tracking-wider">
                  Alasan Permintaan Absen Masuk
                </label>
                <textarea
                  required
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Masukkan alasan Anda (contoh: Penugasan lembur dari kelurahan, piket malam darurat, dll)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 text-zinc-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <Button 
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="flex-1 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {isSubmittingRequest ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Kirim Permintaan'
                  )}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequestAbsenModalOpen(false)}
                  className="flex-1 py-5 rounded-xl font-bold text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100"
                >
                  Batal
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <Clock className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">Permintaan Terkirim! 🚀</h3>
              <p className="text-zinc-655 dark:text-zinc-400 text-xs leading-relaxed">
                Halo **{user?.fullName}**, pengajuan absensi di luar jadwal kerja Anda telah berhasil direkam oleh sistem!
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-xs p-3.5 rounded-2xl text-left leading-relaxed">
                <strong>Status: Menunggu Diterima</strong><br/>
                Pengajuan Anda sedang dikirimkan untuk ditinjau oleh pihak **Staff, Pimpinan, dan Admin**. Kami akan segera memberi tahu Anda setelah disetujui!
              </div>
            </div>

            <Button
              onClick={() => setShowSuccessRequestModal(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-6 rounded-2xl shadow-lg transition-all active:scale-95"
            >
              Mengerti, Terima Kasih! 👍
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
