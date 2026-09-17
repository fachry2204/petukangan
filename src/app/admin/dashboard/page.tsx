'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { AlertCircle, ArrowRight, BarChart3, CalendarDays, ChevronRight, Clock3, Fingerprint, Loader2, Map, MapPin, Moon, Siren, Sun, Sunset, TriangleAlert, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRealtime } from '@/hooks/use-realtime';
import { apiUrl } from '@/lib/api-config';
import { cn } from '@/lib/utils';

type Stats = { totalPetugas: number; petugasPiket: number; sudahAbsen: number; belumAbsen: number; izinTidakMasuk: number; lakiLaki: number; perempuan: number; tidakAktif: number; dikeluarkan: number };
type Trend = { key: string; date: string; day: string; hadir: number; izin: number; tidakHadir: number };
type Shift = { name: string; timeRange: string; total: number; present: number };
type Activity = { id: string; name: string; detail: string; time: string; timestamp: number; photo?: string; color: string };

const emptyStats: Stats = { totalPetugas: 0, petugasPiket: 0, sudahAbsen: 0, belumAbsen: 0, izinTidakMasuk: 0, lakiLaki: 0, perempuan: 0, tidakAktif: 0, dikeluarkan: 0 };
const dateKey = (value: Date | string | number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const assignedUsers = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};
const activityLabel: Record<string, string> = { IN: 'Melakukan absensi masuk', BREAK_START: 'Memulai istirahat', BREAK_END: 'Selesai istirahat', OUT: 'Melakukan absensi pulang', PERMIT: 'Mengajukan izin tidak masuk', EARLY_OUT: 'Mengajukan pulang awal' };

export default function AdminDashboardPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [trend, setTrend] = useState<Trend[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [followUps, setFollowUps] = useState({ late: 0, absent: 0, fakeGps: 0, sos: 0 });

  const fetchDashboard = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const results = await Promise.allSettled([
        axios.get(`${apiUrl}/users`, { headers, signal }),
        axios.get(`${apiUrl}/dashboard/attendance-stats`, { headers, signal }),
        axios.get(`${apiUrl}/attendance/admin`, { headers, signal }),
        axios.get(`${apiUrl}/schedules`, { headers, signal }),
        axios.get(`${apiUrl}/sos`, { signal }),
      ]);
      const data = results.map((result) => result.status === 'fulfilled' ? result.value.data : []);
      const users = Array.isArray(data[0]) ? data[0] : [];
      const daily = data[1] || {};
      const attendance = Array.isArray(data[2]) ? data[2] : [];
      const schedules = Array.isArray(data[3]) ? data[3] : [];
      const sos = Array.isArray(data[4]) ? data[4] : [];
      const petugas = users.filter((user: any) => String(user.role?.name || user.roleName || '').toUpperCase() === 'PJLP');
      const normalizedGender = (value: unknown) => String(value || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
      const normalizedStatus = (value: unknown) => String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
      const totalPetugas = petugas.length;
      setStats({
        totalPetugas,
        petugasPiket: +daily.petugasPiket || 0,
        sudahAbsen: +daily.sudahAbsen || 0,
        belumAbsen: +daily.belumAbsen || 0,
        izinTidakMasuk: +daily.izinTidakMasuk || 0,
        lakiLaki: petugas.filter((user: any) => ['LAKILAKI', 'PRIA', 'MALE'].includes(normalizedGender(user.gender))).length,
        perempuan: petugas.filter((user: any) => ['PEREMPUAN', 'WANITA', 'FEMALE'].includes(normalizedGender(user.gender))).length,
        tidakAktif: petugas.filter((user: any) => ['INACTIVE', 'TIDAK_AKTIF', 'NONAKTIF'].includes(normalizedStatus(user.status))).length,
        dikeluarkan: petugas.filter((user: any) => ['TERMINATED', 'DIKELUARKAN', 'KELUAR'].includes(normalizedStatus(user.status))).length,
      });

      const today = dateKey(new Date());
      const todayAttendance = attendance.filter((row: any) => dateKey(row.timestamp) === today);
      const todaySchedules = schedules.filter((row: any) => dateKey(row.date) === today);
      const sevenDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(); date.setDate(date.getDate() - (6 - index));
        const key = dateKey(date);
        const scheduled = new Set<number>();
        schedules.filter((row: any) => dateKey(row.date) === key).forEach((row: any) => assignedUsers(row.assignedUsers).forEach((user: any) => scheduled.add(+(user.id ?? user.userId))));
        const records = attendance.filter((row: any) => dateKey(row.timestamp) === key);
        const hadir = new Set(records.filter((row: any) => row.type === 'IN' && !['PENDING', 'REJECTED'].includes(row.status)).map((row: any) => +(row.userId ?? row.user?.id)));
        const izin = new Set(records.filter((row: any) => row.type === 'PERMIT' && row.status === 'APPROVED').map((row: any) => +(row.userId ?? row.user?.id)));
        const parts = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', weekday: 'short' }).formatToParts(date);
        return { key, date: `${parts.find((p) => p.type === 'day')?.value} ${parts.find((p) => p.type === 'month')?.value}`, day: parts.find((p) => p.type === 'weekday')?.value || '', hadir: hadir.size, izin: izin.size, tidakHadir: [...scheduled].filter((id) => !hadir.has(id) && !izin.has(id)).length };
      });
      setTrend(sevenDays);

      const inRecords = todayAttendance.filter((row: any) => row.type === 'IN' && !['PENDING', 'REJECTED'].includes(row.status));
      setShifts(todaySchedules.slice(0, 3).map((schedule: any) => {
        const ids = new Set(assignedUsers(schedule.assignedUsers).map((user: any) => +(user.id ?? user.userId)).filter(Boolean));
        const present = new Set(inRecords.filter((row: any) => ids.has(+(row.userId ?? row.user?.id))).map((row: any) => +(row.userId ?? row.user?.id))).size;
        return { name: schedule.shiftName || 'Shift', timeRange: schedule.timeRange || '-', total: ids.size, present };
      }));

      setFollowUps({
        late: todayAttendance.filter((row: any) => row.isOutsideSchedule && row.status === 'PENDING').length,
        absent: +daily.belumAbsen || 0,
        fakeGps: new Set(todayAttendance.filter((row: any) => row.isMock).map((row: any) => +(row.userId ?? row.user?.id))).size,
        sos: sos.filter((row: any) => String(row.status).toUpperCase() !== 'SELESAI').length,
      });

      const attendanceActivity: Activity[] = attendance.slice(0, 10).map((row: any) => ({ id: `a-${row.id}-${row.type}`, name: row.user?.fullName || row.fullName || 'Petugas', detail: activityLabel[row.type] || 'Memperbarui aktivitas', time: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(row.timestamp)), timestamp: new Date(row.timestamp).getTime(), photo: row.user?.photoUrl, color: row.isMock ? 'bg-red-500' : row.type === 'PERMIT' ? 'bg-amber-400' : 'bg-emerald-500' }));
      const sosActivity: Activity[] = sos.slice(0, 6).map((row: any) => ({ id: `s-${row.id}`, name: row.fullName || 'Petugas', detail: `Mengirim SOS${row.address ? ` · ${row.address}` : ''}`, time: String(row.timeSos || '').slice(0, 5), timestamp: new Date(row.timestamp || row.dateSos).getTime(), photo: row.photoUrl, color: 'bg-red-500' }));
      setActivities([...attendanceActivity, ...sosActivity].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5));
    } catch (error) {
      if (!axios.isCancel(error)) console.error('Failed to load dashboard:', error);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { const controller = new AbortController(); fetchDashboard(controller.signal); return () => controller.abort(); }, [fetchDashboard]);
  useRealtime((event) => { if (['user', 'schedule', 'attendance', 'sos'].includes(event.entity)) fetchDashboard(); }, ['user', 'schedule', 'attendance', 'sos']);

  const totalAttendance = Math.max(stats.petugasPiket, stats.sudahAbsen + stats.izinTidakMasuk + stats.belumAbsen);
  const hadirPct = totalAttendance ? Math.round(stats.sudahAbsen / totalAttendance * 100) : 0;
  const izinPct = totalAttendance ? Math.round(stats.izinTidakMasuk / totalAttendance * 100) : 0;
  const absentPct = Math.max(0, 100 - hadirPct - izinPct);
  const maxChart = Math.max(1, ...trend.flatMap((row) => [row.hadir, row.izin, row.tidakHadir]));
  const cards = useMemo(() => [
    ['Total Petugas', stats.totalPetugas, '/icons/dashboard/total-petugas-orange.png', `${stats.totalPetugas} terdata`, 'from-orange-50 to-white', 'bg-emerald-100 text-emerald-700'],
    ['Piket Hari Ini', stats.petugasPiket, '/icons/dashboard/petugas-piket.png', stats.totalPetugas ? `${Math.round(stats.petugasPiket / stats.totalPetugas * 100)}%` : '0%', 'from-blue-50 to-white', 'bg-blue-100 text-blue-700'],
    ['Sudah Absen', stats.sudahAbsen, '/icons/dashboard/sudah-absen.png', `${hadirPct}% hadir`, 'from-emerald-50 to-white', 'bg-emerald-100 text-emerald-700'],
    ['Belum Absen', stats.belumAbsen, '/icons/dashboard/belum-absen.png', `${absentPct}%`, 'from-rose-50 to-white', 'bg-rose-100 text-rose-600'],
    ['Petugas Laki-Laki', stats.lakiLaki, '/icons/dashboard/laki-laki-orange.png', `${stats.lakiLaki} orang`, 'from-blue-50 to-white', 'bg-blue-100 text-blue-700'],
    ['Petugas Perempuan', stats.perempuan, '/icons/dashboard/perempuan-orange.png', `${stats.perempuan} orang`, 'from-pink-50 to-white', 'bg-pink-100 text-pink-700'],
    ['Petugas Tidak Aktif', stats.tidakAktif, '/icons/dashboard/tidak-aktif-orange.png', `${stats.tidakAktif} orang`, 'from-zinc-100 to-white', 'bg-zinc-200 text-zinc-700'],
    ['Petugas Dikeluarkan', stats.dikeluarkan, '/icons/dashboard/dikeluarkan-orange.png', `${stats.dikeluarkan} orang`, 'from-red-50 to-white', 'bg-red-100 text-red-700'],
  ], [absentPct, hadirPct, stats]);

  if (loading) return <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3"><Loader2 className="h-9 w-9 animate-spin text-orange-500" /><p className="text-sm font-semibold text-zinc-500">Memuat dashboard operasional...</p></div>;

  return <div className="space-y-4 pb-3">
    <div className="flex flex-wrap justify-end gap-2">
      <Action onClick={() => router.push('/admin/users/add')} primary icon={UserPlus}>Tambah Petugas</Action>
      <Action onClick={() => router.push('/admin/schedules')} icon={CalendarDays}>Buat Jadwal</Action>
      <Action onClick={() => router.push('/admin/monitoring')} icon={Map}>Lihat Monitoring</Action>
    </div>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {cards.map(([label, value, icon, badge, background, badgeClass]) => <article key={String(label)} className={cn('flex min-h-[128px] items-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br p-4 shadow-[0_8px_24px_rgba(24,24,27,.05)]', background)}><div className="relative h-20 w-24 shrink-0"><Image src={String(icon)} alt="" fill sizes="96px" className="object-contain drop-shadow-md" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-zinc-500">{label}</p><p className="mt-1 text-3xl font-black leading-none text-zinc-950">{value}</p><span className={cn('mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-black', badgeClass)}>{badge}</span></div></article>)}
    </section>

    <section className="grid gap-3 xl:grid-cols-[1.85fr_1fr]">
      <Panel title="Tren Kehadiran 7 Hari" subtitle="Jumlah petugas berdasarkan status kehadiran" icon={BarChart3} action="7 Hari Terakhir">
        <div className="relative h-[230px] rounded-xl bg-[linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-[size:100%_20%] px-2 pt-3"><div className="flex h-[180px] items-end justify-around gap-2 border-b border-zinc-200">{trend.map((row) => <div key={row.key} className="flex h-full min-w-0 flex-1 flex-col justify-end"><div className="flex h-[145px] items-end justify-center gap-1">{[[row.hadir, 'bg-emerald-500'], [row.izin, 'bg-blue-500'], [row.tidakHadir, 'bg-red-500']].map(([value, color], index) => <div key={index} className={cn('relative w-[18%] min-w-[7px] max-w-5 rounded-t-sm', color)} style={{ height: `${Math.max(Number(value) ? 8 : 2, Number(value) / maxChart * 100)}%` }}><span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-zinc-600">{value}</span></div>)}</div><div className="pt-2 text-center"><p className="text-[9px] font-bold text-zinc-600">{row.date}</p><p className="text-[8px] text-zinc-400">{row.day}</p></div></div>)}</div><Legend /></div>
      </Panel>
      <Panel title="Status Kehadiran Hari Ini" subtitle={`Proporsi kehadiran dari ${totalAttendance} petugas`} icon={Fingerprint}>
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row"><div className="relative h-44 w-44 shrink-0 rounded-full" style={{ background: `conic-gradient(#22c55e 0 ${hadirPct}%,#3b82f6 ${hadirPct}% ${hadirPct + izinPct}%,#ef4444 ${hadirPct + izinPct}% 100%)` }}><div className="absolute inset-10 flex flex-col items-center justify-center rounded-full bg-white shadow-inner"><strong className="text-3xl font-black">{totalAttendance}</strong><span className="text-[10px] text-zinc-400">Total</span></div></div><div className="w-full space-y-3">{[['Hadir', stats.sudahAbsen, hadirPct, 'bg-emerald-500'], ['Izin', stats.izinTidakMasuk, izinPct, 'bg-blue-500'], ['Tidak Hadir', stats.belumAbsen, absentPct, 'bg-red-500']].map(([label, value, pct, color]) => <div key={String(label)} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-zinc-100 pb-3 text-xs"><span className="flex items-center gap-2 font-bold text-zinc-700"><i className={cn('h-3 w-3 rounded-full', color)} />{label}</span><strong>{value}</strong><span className="w-9 text-right font-bold text-zinc-400">{pct}%</span></div>)}</div></div>
      </Panel>
    </section>

    <section className="grid gap-3 xl:grid-cols-3">
      <Panel title="Jadwal Shift Hari Ini" subtitle="Progres kehadiran per shift" icon={CalendarDays}><div className="space-y-1.5">{(shifts.length ? shifts : [{ name: 'Belum ada jadwal', timeRange: '-', total: 0, present: 0 }]).map((shift, index) => <ShiftRow key={`${shift.name}-${index}`} shift={shift} index={index} />)}</div></Panel>
      <Panel title="Perlu Ditindaklanjuti" subtitle="Data yang memerlukan perhatian" icon={TriangleAlert} warning><div className="divide-y divide-zinc-100">{[
        { label: 'Terlambat Absen', sub: 'Permintaan absen di luar jadwal', value: followUps.late, Icon: AlertCircle, href: '/admin/attendance', color: 'bg-red-500' },
        { label: 'Tidak Absen', sub: 'Belum melakukan absensi', value: followUps.absent, Icon: Clock3, href: '/admin/attendance', color: 'bg-amber-400' },
        { label: 'GPS Tidak Valid', sub: 'Terdeteksi menggunakan GPS palsu', value: followUps.fakeGps, Icon: MapPin, href: '/admin/gps-history', color: 'bg-blue-500' },
        { label: 'Laporan SOS', sub: 'Permintaan bantuan aktif', value: followUps.sos, Icon: Siren, href: '/admin/sos', color: 'bg-red-500' },
      ].map(({ label, sub, value, Icon, href, color }) => <button key={label} onClick={() => router.push(href)} className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-2 text-left hover:bg-zinc-50"><span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-white', color)}><Icon className="h-4 w-4" /></span><span><strong className="block text-xs text-zinc-800">{label}</strong><small className="block text-[9px] text-zinc-400">{sub}</small></span><span className="min-w-9 rounded-full bg-zinc-100 px-2 py-1 text-center text-[10px] font-black">{value}</span><ChevronRight className="h-4 w-4 text-zinc-300" /></button>)}</div></Panel>
      <Panel title="Aktivitas Terbaru" subtitle="Log aktivitas terkini dalam sistem" icon={Clock3} action="Lihat Semua" onAction={() => router.push('/admin/attendance')}><div className="relative ml-1 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-zinc-200">{activities.length ? activities.map((item) => <div key={item.id} className="relative grid grid-cols-[10px_38px_1fr] items-center gap-2 border-b border-zinc-100 py-1.5 last:border-0"><i className={cn('relative z-10 h-2 w-2 rounded-full', item.color)} /><span className="text-[9px] font-semibold text-zinc-400">{item.time}</span><div className="flex min-w-0 items-center gap-2"><div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-orange-50"><Image src={item.photo || '/icons/dashboard/petugas-aktif-orange.png'} alt="" fill sizes="28px" className="object-cover" /></div><div className="min-w-0"><p className="truncate text-[10px] font-black text-zinc-800">{item.name}</p><p className="truncate text-[9px] text-zinc-400">{item.detail}</p></div></div></div>) : <div className="py-10 text-center text-xs text-zinc-400">Belum ada aktivitas hari ini.</div>}</div></Panel>
    </section>
  </div>;
}

function Action({ children, icon: Icon, primary, onClick }: { children: React.ReactNode; icon: React.ElementType; primary?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={cn('flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold shadow-sm transition', primary ? 'bg-orange-500 text-white shadow-orange-500/20 hover:bg-orange-600' : 'border border-zinc-200 bg-white text-zinc-700 hover:border-orange-200 hover:bg-orange-50')}><Icon className="h-4 w-4" />{children}</button>;
}

function Panel({ title, subtitle, icon: Icon, children, action, onAction, warning }: { title: string; subtitle: string; icon: React.ElementType; children: React.ReactNode; action?: string; onAction?: () => void; warning?: boolean }) {
  return <article className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(24,24,27,.05)]"><div className="mb-3 flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', warning ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-600')}><Icon className="h-5 w-5" /></span><div><h2 className="text-base font-black text-zinc-950">{title}</h2><p className="text-[11px] text-zinc-400">{subtitle}</p></div></div>{action && <button onClick={onAction} className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[9px] font-bold text-zinc-500">{action}{onAction && <ArrowRight className="h-3 w-3" />}</button>}</div>{children}</article>;
}

function Legend() { return <div className="mt-3 flex justify-center gap-5 text-[9px] font-semibold text-zinc-500"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Hadir</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-blue-500" />Izin</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-500" />Tidak Hadir</span></div>; }

function ShiftRow({ shift, index }: { shift: Shift; index: number }) {
  const pct = shift.total ? Math.round(shift.present / shift.total * 100) : 0;
  const Icon = index === 0 ? Sun : index === 1 ? Sunset : Moon;
  return <div className="grid grid-cols-[1fr_1.2fr_auto] items-center gap-3 rounded-xl bg-zinc-50 px-3 py-3"><div className="flex min-w-0 items-center gap-2"><Icon className={cn('h-5 w-5 shrink-0', index === 2 ? 'text-blue-600' : 'text-amber-500')} /><div className="min-w-0"><p className="truncate text-xs font-black text-zinc-800">{shift.name}</p><p className="truncate text-[9px] text-zinc-400">{shift.timeRange}</p></div></div><div className="h-2 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} /></div><div className="text-right"><p className="text-[10px] font-bold text-zinc-600">{shift.present}/{shift.total}</p><span className={cn('rounded-full px-2 py-1 text-[9px] font-black', pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600')}>{pct}%</span></div></div>;
}
