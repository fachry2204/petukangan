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
  FileText
} from 'lucide-react';

import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api-config';
import { bundledIcons } from '@/lib/bundled-icons';

export default function PjlpHomePage() {
  const { user, token, setAuth } = useAuthStore();
  const attendanceMode = useSettingsStore((state) => state.attendanceMode);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [attendanceStatus, setAttendanceStatus] = useState<string>('Belum Absen');
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [sessionShift, setSessionShift] = useState<{ name: string; timeRange: string | null } | null>(null);
  const [allSchedules, setAllSchedules] = useState<any[]>([]);
  const [stats, setStats] = useState({
    absenMasuk: 0,
    tidakHadir: 0,
    izinCount: 0,
    totalTugas: 0,
    totalLaporan: 0,
    poinPerforma: 98,
    hariKerja: 0,
  });

  const [todayIzinStatus, setTodayIzinStatus] = useState<string | null>(null);
  const [todayIzinType, setTodayIzinType] = useState<string | null>(null);

  const [isIzinModalOpen, setIsIzinModalOpen] = useState(false);
  const [izinType, setIzinType] = useState<'PERMIT' | 'EARLY_OUT'>('PERMIT');
  const [izinCategory, setIzinCategory] = useState('Sakit');
  const [izinReason, setIzinReason] = useState('');
  const [suratDokter, setSuratDokter] = useState<string | null>(null);
  const [isSubmittingIzin, setIsSubmittingIzin] = useState(false);

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
      setSessionShift(resAtt.data.selectedShift || null);
      setTodayIzinStatus(resAtt.data.izinStatus || null);
      setTodayIzinType(resAtt.data.izinType || null);

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
        .filter((s: any) => s.assignedUsers.some((au: any) => String(au.id) === String(user.id)));
      setAllSchedules(mySchedules);

      // Match today's schedule (or active night shift session schedule)
      const localTodayStr = getJakartaTodayString();
      const sessionDateStr = resAtt.data.sessionDate;
      const currentAttStatus = resAtt.data.status;
      const isActiveSession = currentAttStatus && !['Belum Absen', 'Sudah Absen Pulang', 'Sudah Check-Out', 'Sudah Checkout'].includes(currentAttStatus);
      const targetDateStr = (isActiveSession && sessionDateStr) ? sessionDateStr : localTodayStr;

      const sessionSchedule = mySchedules.find((s: any) => {
        const sDateStr = s.date ? getLocalDateString(s.date) : '';
        return sDateStr === targetDateStr;
      });
      const currentDaySchedule = mySchedules.find((s: any) => {
        const sDateStr = s.date ? getLocalDateString(s.date) : '';
        return sDateStr === localTodayStr;
      });
      setTodaySchedule(sessionSchedule || currentDaySchedule || null);

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
        hariKerja: currentMonthSchedules.length,
      });

    } catch (error) {
      console.error('Error fetching PJLP dashboard data:', error);
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

  const shiftText = attendanceMode === 'FREE'
    ? (sessionShift ? `${sessionShift.name}${sessionShift.timeRange ? ` (${sessionShift.timeRange.split(' - ')[0]} WIB)` : ''}` : 'Pilih saat absen masuk')
    : todaySchedule
      ? `${todaySchedule.shiftName} (${todaySchedule.timeRange?.split(' - ')[0] || ''} WIB)`
      : 'Libur';

  const zoneText = todaySchedule && attendanceMode !== 'FREE'
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
  const todayKey = getJakartaTodayString();
  const nextSchedule = [...allSchedules]
    .filter((schedule: any) => getLocalDateString(schedule.date) > todayKey)
    .sort((a: any, b: any) => getLocalDateString(a.date).localeCompare(getLocalDateString(b.date)))[0] || null;
  const nextScheduleDate = nextSchedule?.date ? new Date(nextSchedule.date) : null;
  const nextScheduleLabel = nextScheduleDate
    ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }).format(nextScheduleDate)
    : 'Belum ada jadwal';
  const nextScheduleZone = nextSchedule
    ? (typeof nextSchedule.zone === 'object' ? nextSchedule.zone?.name : nextSchedule.zone)
    : '-';
  const attendanceActionLabel = attendanceStatus === 'Belum Absen'
    ? 'Absen Masuk'
    : attendanceStatus === 'Sudah Absen'
      ? 'Mulai Istirahat'
      : attendanceStatus === 'Absen Istirahat'
        ? 'Selesai Istirahat'
        : attendanceStatus === 'Selesai Istirahat'
          ? 'Absen Pulang'
          : 'Buka Absensi';
  const attendanceCompleted = ['Sudah Absen Pulang', 'Sudah Check-Out', 'Sudah Checkout'].includes(attendanceStatus);
  const noSchedule = attendanceMode !== 'FREE' && attendanceStatus === 'Belum Absen' && (!todaySchedule || shiftText === 'Libur');

  return (
    <div className="flex flex-col gap-5 pb-5 pt-4 sm:pt-5">
      <section aria-label="Profil petugas" className="rounded-[1.75rem] border border-orange-100/80 bg-white p-5 shadow-[0_16px_40px_rgba(24,24,27,0.07)] dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-3 min-[430px]:flex-nowrap min-[430px]:gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-orange-100 bg-orange-50 shadow-md min-[430px]:h-[72px] min-[430px]:w-[72px]">
            <img
              src="/gambar/pjlp-attendance-hero.png"
              alt="Ilustrasi Petugas PPSU"
              className="h-full w-full scale-110 object-cover object-[88%_24%]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">{getGreeting()},</p>
            <h2 className="truncate text-xl font-black leading-tight text-zinc-950 dark:text-white">{user?.fullName || 'Petugas PJLP'}</h2>
            <p className="mt-1 text-xs font-semibold text-zinc-500">ID Petugas: <span className="font-black text-orange-600">{user?.username || '-'}</span></p>
          </div>
          <div className="relative h-[62px] w-full overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 min-[430px]:h-[72px] min-[430px]:w-[142px] min-[430px]:shrink-0 dark:border-orange-900/40 dark:bg-orange-950/30">
            <img
              src="/gambar/pjlp-attendance-hero.png"
              alt="Ilustrasi Monas"
              className="pointer-events-none absolute inset-y-0 right-0 h-full w-[92px] object-cover object-[45%_55%] opacity-85"
            />
            <div className="relative z-10 max-w-[58%] min-[430px]:max-w-[72px]">
              <p className="text-[9px] font-black uppercase leading-tight text-orange-600">Tetap semangat</p>
              <p className="mt-1 text-[9px] font-semibold leading-tight text-zinc-700 dark:text-zinc-200">Melayani Jakarta lebih bersih!</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{serverDate || 'Memuat tanggal...'}</p>
            <p className="mt-0.5 text-xl font-black tabular-nums text-zinc-950 dark:text-white">{serverTime || '00:00:00 WIB'}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[9px] font-black uppercase">Online</span>
          </div>
        </div>
      </section>

      <section aria-label="Status absensi hari ini" className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 p-5 text-white shadow-[0_18px_40px_rgba(249,115,22,0.28)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-amber-300/25 blur-2xl" />
        <img
          src="/gambar/pjlp-attendance-hero.png"
          alt="Ilustrasi Petugas PPSU dengan latar Monas"
          className="pointer-events-none absolute bottom-[72px] right-0 w-[270px] max-w-[68%] select-none object-contain object-right-bottom opacity-100 min-[430px]:w-[300px]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-orange-500 via-orange-500/95 to-transparent" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/80">Status Hari Ini</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-orange-600 shadow-sm"><Clock className="h-6 w-6" /></div>
            <p className="text-2xl font-black leading-none">{attendanceStatus}</p>
          </div>
          <div className="mt-5 max-w-[62%] space-y-2.5 text-sm font-bold">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{shiftText}</span></div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>Zona Kerja • {zoneText}</span></div>
          </div>
          <div className="relative z-20 mt-5 flex gap-2.5">
            {attendanceStatus === 'Menunggu Diterima' ? (
              <Button disabled className="h-14 w-full rounded-2xl border border-white/30 bg-white/20 font-black text-white">Permintaan Absensi Ditinjau</Button>
            ) : attendanceCompleted ? (
              <Button disabled className="h-14 w-full rounded-2xl border border-white/30 bg-white/20 font-black text-white">Tugas Hari Ini Selesai</Button>
            ) : ['Izin Tidak Masuk', 'Pulang Awal'].includes(attendanceStatus) || todayIzinStatus ? (
              <Button disabled className="h-14 w-full rounded-2xl border border-white/30 bg-white/20 font-black text-white">
                {todayIzinStatus === 'PENDING' ? 'Pengajuan Izin Ditinjau' : todayIzinStatus === 'APPROVED' ? 'Izin Telah Disetujui' : attendanceStatus}
              </Button>
            ) : noSchedule ? (
              <Button disabled className="h-14 w-full rounded-2xl border border-white/20 bg-white/15 font-black text-white/80">Tidak Ada Jadwal Hari Ini</Button>
            ) : (
              <>
                <Button onClick={() => router.push('/pjlp/attendance')} className="h-14 flex-[1.7] rounded-2xl bg-white font-black text-orange-600 shadow-lg hover:bg-orange-50">{attendanceActionLabel}</Button>
                <Button onClick={() => handleOpenIzinModal(attendanceStatus === 'Belum Absen' ? 'PERMIT' : 'EARLY_OUT')} className="h-14 flex-1 rounded-2xl border-2 border-white bg-transparent px-2 font-black text-white hover:bg-white/10">
                  {attendanceStatus === 'Belum Absen' ? 'Ajukan Izin' : 'Pulang Awal'}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5 text-emerald-700 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
        <div className="flex items-center gap-2.5"><MapPin className="h-5 w-5 fill-emerald-500 text-emerald-600" /><span className="text-xs font-black">GPS Aktif • Live Tracking</span></div>
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 ring-4 ring-emerald-200/70" />
      </div>

      <section aria-labelledby="monthly-summary-title-new">
        <div className="mb-3 flex items-end justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">Aktivitas</p><h3 id="monthly-summary-title-new" className="text-xl font-black text-zinc-950 dark:text-white">Ringkasan Bulan Ini</h3></div>
          <button onClick={() => router.push('/pjlp/schedule')} className="text-[11px] font-black text-orange-600">Lihat Detail ›</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Hari Masuk', value: stats.absenMasuk, icon: bundledIcons.hariMasuk, tone: 'text-emerald-600', sub: `Dari ${stats.hariKerja} hari kerja` },
            { label: 'Izin', value: stats.izinCount, icon: bundledIcons.izin, tone: 'text-orange-600', sub: `Dari ${stats.hariKerja} hari kerja` },
            { label: 'Tidak Hadir', value: stats.tidakHadir, icon: bundledIcons.tidakHadir, tone: 'text-red-600', sub: `Dari ${stats.hariKerja} hari kerja` },
            { label: 'Performa', value: `${stats.poinPerforma}%`, icon: bundledIcons.performa, tone: 'text-emerald-600', sub: 'Kerja baik, pertahankan!' },
          ].map((stat) => (
            <Card key={stat.label} className="rounded-2xl border border-zinc-200/70 bg-white shadow-[0_7px_20px_rgba(24,24,27,0.07)] dark:border-zinc-800 dark:bg-zinc-900">
              <CardContent className="flex min-h-[112px] items-center gap-2 p-3 min-[390px]:gap-3 min-[390px]:p-4">
                <img src={stat.icon} alt={`Ikon ${stat.label}`} className="h-14 w-14 shrink-0 object-contain min-[390px]:h-16 min-[390px]:w-16" />
                <div className="min-w-0 flex-1">
                  <div className={`text-2xl font-black leading-none min-[390px]:text-3xl ${stat.tone}`}>{stat.value}</div>
                  <p className="mt-1 text-[11px] font-black leading-tight text-zinc-900 min-[390px]:text-sm dark:text-white">{stat.label}</p>
                  <p className="mt-0.5 truncate text-[8px] font-medium leading-tight text-zinc-400 min-[390px]:text-[9px]">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="next-schedule-title">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><img src="/gambar/icon/calender.png" alt="" className="h-6 w-6 object-contain" /><h3 id="next-schedule-title" className="text-lg font-black text-zinc-950 dark:text-white">Jadwal Berikutnya</h3></div>
          <button onClick={() => router.push('/pjlp/schedule')} className="text-[11px] font-black text-orange-600">Lihat Semua ›</button>
        </div>
        <Card className="relative overflow-hidden rounded-[1.5rem] border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <img src="/gambar/pjlp-attendance-hero.png" alt="" className="pointer-events-none absolute bottom-0 right-1 w-36 max-w-[38%] object-contain object-right-bottom opacity-90" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/35 dark:from-zinc-900 dark:via-zinc-900/95 dark:to-zinc-900/40" />
          <CardContent className="relative z-10 flex items-center gap-4 p-4">
            <div className="flex h-[76px] w-[64px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 text-center">
              <span className="w-full bg-orange-500 py-1 text-[8px] font-black uppercase text-white">Berikutnya</span>
              <span className="mt-1 text-xl font-black text-zinc-950 dark:text-white">{nextScheduleDate ? nextScheduleDate.getDate() : '—'}</span>
              <span className="text-[9px] font-bold text-zinc-500">{nextScheduleDate ? new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(nextScheduleDate) : '-'}</span>
            </div>
            <div className="min-w-0 flex-1 pr-12">
              <p className="truncate text-sm font-black text-zinc-950 dark:text-white">{nextScheduleLabel}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300"><Clock className="h-3.5 w-3.5 text-orange-500" />{nextSchedule?.shiftName || 'Belum ditentukan'} {nextSchedule?.timeRange ? `• ${nextSchedule.timeRange}` : ''}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300"><MapPin className="h-3.5 w-3.5 text-orange-500" />{nextScheduleZone}</p>
            </div>
            <span className="text-2xl font-bold text-zinc-300">›</span>
          </CardContent>
        </Card>
      </section>

      <div className="hidden">
      <section aria-label="Ringkasan petugas hari ini" className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
      {/* Welcome Section in Premium Card View */}
      <Card 
        className="relative min-h-[168px] overflow-hidden rounded-[1.75rem] border border-white/80 shadow-[0_18px_45px_rgba(24,24,27,0.08)] dark:border-zinc-800"
        style={{ 
          backgroundImage: "url('/gambar/bgheaderpjlp.jpg')", 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/95 via-white/82 to-orange-50/80 backdrop-blur-[2px] dark:from-zinc-950/95 dark:via-zinc-950/85 dark:to-orange-950/30" />
        <CardContent className="relative z-10 flex h-full flex-col justify-between gap-5 p-5 sm:p-6">
          
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Profile Photo */}
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-zinc-50 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
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
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">{getGreeting()},</p>
              <h2 className="text-lg font-black leading-tight text-zinc-900 dark:text-white">
                {user?.fullName || 'Petugas PJLP'} 👋
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
          <div className="flex w-full items-end justify-between border-t border-orange-100/80 pt-3 dark:border-zinc-800">
            <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-300">
              {serverDate || 'Memuat Tanggal...'}
            </p>
            <p className="mt-0.5 text-xl font-black tabular-nums text-zinc-900 dark:text-white">
              {serverTime || '00:00:00 WIB'}
            </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[8px] font-black uppercase tracking-wider">Waktu WIB</span>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Attendance Summary Card */}
      <div className="h-full animate-in fade-in slide-in-from-bottom-5 duration-500">
        <Card className={`relative h-full min-h-[220px] overflow-hidden rounded-[1.75rem] border-none text-white shadow-[0_18px_45px_rgba(24,24,27,0.13)] ${cardTheme.cardBg}`}>
          {/* Subtle Decorative Background Circles */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none" />
          
          <CardContent className="relative z-10 flex h-full flex-col p-5 sm:p-6">
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
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                <div className="flex items-center gap-1 text-white/80">
                  <Clock className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Shift Masuk</span>
                </div>
                <p className="text-sm font-black truncate">{shiftText}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
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
                Permintaan Absensi Ditinjau
              </Button>
            ) : ['Sudah Absen Pulang', 'Sudah Check-Out', 'Sudah Checkout'].includes(attendanceStatus) ? (
              <Button disabled className="w-full mt-4 bg-white/20 text-white border border-white/25 rounded-2xl font-black py-5 text-sm cursor-not-allowed">
                Tugas Hari Ini Selesai
              </Button>
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
              <div className="mt-auto flex gap-2.5 pt-4">
                {attendanceMode !== 'FREE' && attendanceStatus === 'Belum Absen' && (!todaySchedule || shiftText === 'Libur') ? (
                  <Button disabled className="w-full bg-white/20 text-white border border-white/25 rounded-2xl font-black py-5 text-sm cursor-not-allowed">
                    Tidak Ada Jadwal Hari Ini
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => { window.location.href = '/pjlp/attendance'; }}
                      className={`flex-[2.2] rounded-2xl font-black py-5 text-sm shadow-md transition-all duration-300 transform active:scale-95 bg-white hover:bg-zinc-100 ${cardTheme.btnText}`}
                    >
                      {attendanceStatus === 'Belum Absen' && 'Absen Masuk'}
                      {attendanceStatus === 'Sudah Absen' && 'Mulai Istirahat'}
                      {attendanceStatus === 'Absen Istirahat' && 'Selesai Istirahat'}
                      {attendanceStatus === 'Selesai Istirahat' && 'Absen Pulang'}
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
      </section>

      {/* Dynamic 3-Column Stats Grid (Calculated Monthly) */}
      <section className="flex flex-col gap-3" aria-labelledby="monthly-summary-title">
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">Aktivitas</p>
            <h3 id="monthly-summary-title" className="text-lg font-black text-zinc-900 dark:text-white">Ringkasan Bulan Ini</h3>
          </div>
          <Badge variant="outline" className="rounded-full bg-white text-[10px] font-bold dark:bg-zinc-900">Diperbarui langsung</Badge>
        </div>
        {/* Row 1: Attendance Indicators */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'Total Masuk', value: stats.absenMasuk, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' },
            { label: 'Total Tidak Masuk', value: stats.tidakHadir, icon: AlertTriangle, color: 'text-red-650', bg: 'bg-red-50 dark:bg-red-950/20' },
            { label: 'Total Izin', value: stats.izinCount, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
          ].map((stat, idx) => (
            <Card key={idx} className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
              <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
                <div className={`${stat.bg} p-2.5 rounded-xl`}>
                  {stat.icon === Calendar ? (
                    <img src="/gambar/icon/calender.png" alt="Kalender" className="w-5 h-5 object-contain" />
                  ) : (
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  )}
                </div>
                <div>
                  <p className="text-xl font-black leading-none text-zinc-900 dark:text-white">{stat.value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase leading-tight tracking-wider text-zinc-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Row 2: Operational Indicators */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'Total Tugas', value: stats.totalTugas, icon: ClipboardList, color: 'text-orange-650', bg: 'bg-orange-50 dark:bg-orange-950/20' },
            { label: 'Total Laporan', value: stats.totalLaporan, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
            { label: 'Performa', value: `${stats.poinPerforma}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20' },
          ].map((stat, idx) => (
            <Card key={idx} className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
              <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
                <div className={`${stat.bg} p-2.5 rounded-xl`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-black leading-none text-zinc-900 dark:text-white">{stat.value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase leading-tight tracking-wider text-zinc-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Weekly Schedule Section (Table view) */}
      <Card className="w-full overflow-hidden rounded-[1.75rem] border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src="/gambar/icon/calender.png" alt="Jadwal" className="w-5 h-5 object-contain" />
              <h3 className="text-sm font-black text-zinc-800 dark:text-white">Jadwal Seminggu Ini</h3>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/pjlp/schedule')}
              className="shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-orange-600 transition-all hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/20 sm:px-3 sm:text-xs"
            >
              Lihat Jadwal
            </Button>
          </div>

          <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]">
            <table className="w-full min-w-[520px] border-collapse text-left">
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
                        isToday ? 'bg-orange-50/70 dark:bg-orange-950/20' : ''
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
      </div>

      {/* Premium Glassmorphic Izin & Pulang Awal Modal */}
      {isIzinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white/95 dark:bg-zinc-950/95 border border-white/20 dark:border-zinc-800/80 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 transform scale-100 transition-all duration-300 text-left">
            
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

    </div>
  );
}
