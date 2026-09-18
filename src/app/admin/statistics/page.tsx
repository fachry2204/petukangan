'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import axios from 'axios';
import {
  AlertTriangle, BarChart3, CalendarDays, ClipboardCheck,
  Download, Filter, Lightbulb, Loader2, TrendingUp, Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { apiUrl } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { bundledIcons } from '@/lib/bundled-icons';

type Trend = { date: string; hadir: number; izin: number; tidakHadir: number; scheduled: number };
type Ranking = { id: number; username: string; fullName: string; photoUrl?: string | null; value: number; secondary: number };
type StatisticsData = {
  period: { from: string; to: string };
  summary: {
    attendanceRate: number; scheduledTotal: number; presentTotal: number; permitTotal: number;
    absentTotal: number; completedTasks: number; averageTasks: number; attentionOfficers: number; totalTasks: number;
  };
  trend: Trend[];
  rankings: { mostAbsent: Ranking[]; mostTasks: Ranking[]; leastTasks: Ranking[] };
  filters: { shifts: string[]; zones: string[] };
};

const now = new Date();
const localDate = (date: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);
const initialFrom = `${localDate(now).slice(0, 7)}-01`;
const initialTo = localDate(now);

const emptyData: StatisticsData = {
  period: { from: initialFrom, to: initialTo },
  summary: { attendanceRate: 0, scheduledTotal: 0, presentTotal: 0, permitTotal: 0, absentTotal: 0, completedTasks: 0, averageTasks: 0, attentionOfficers: 0, totalTasks: 0 },
  trend: [], rankings: { mostAbsent: [], mostTasks: [], leastTasks: [] }, filters: { shifts: [], zones: [] },
};

export default function StatisticsPage() {
  const token = useAuthStore((state) => state.token);
  const villageName = useSettingsStore((state) => state.villageName);
  const [data, setData] = useState<StatisticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ from: initialFrom, to: initialTo, shift: '', zone: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchStatistics = useCallback(async (activeFilters = appliedFilters, signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from: activeFilters.from, to: activeFilters.to });
      if (activeFilters.shift) params.set('shift', activeFilters.shift);
      if (activeFilters.zone) params.set('zone', activeFilters.zone);
      const response = await axios.get(`${apiUrl}/statistics?${params}`, {
        headers: { Authorization: `Bearer ${token}` }, signal,
      });
      setData(response.data);
    } catch (requestError: unknown) {
      if (!axios.isCancel(requestError)) {
        const message = axios.isAxiosError<{ error?: string }>(requestError)
          ? requestError.response?.data?.error
          : undefined;
        setError(message || 'Statistik gagal dimuat.');
      }
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, token]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => fetchStatistics(appliedFilters, controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [appliedFilters, fetchStatistics]);

  const applyFilters = () => {
    if (filters.from > filters.to) {
      setError('Tanggal awal tidak boleh melebihi tanggal akhir.');
      return;
    }
    setAppliedFilters({ ...filters });
  };

  const exportCsv = () => {
    const rows = [
      ['Statistik Operasional', villageName ? `Kelurahan ${villageName}` : ''],
      ['Periode', `${data.period.from} s/d ${data.period.to}`],
      [],
      ['Ringkasan', 'Nilai'],
      ['Tingkat Kehadiran', `${data.summary.attendanceRate}%`],
      ['Total Kehadiran', data.summary.presentTotal],
      ['Total Izin', data.summary.permitTotal],
      ['Total Tidak Hadir', data.summary.absentTotal],
      ['Tugas Selesai', data.summary.completedTasks],
      ['Rata-rata Tugas/Petugas', data.summary.averageTasks],
      [],
      ['Paling Banyak Tidak Absen', 'ID Petugas', 'Jumlah'],
      ...data.rankings.mostAbsent.map((row) => [row.fullName, row.username, row.value]),
      [],
      ['Paling Banyak Tugas', 'ID Petugas', 'Tugas Selesai'],
      ...data.rankings.mostTasks.map((row) => [row.fullName, row.username, row.value]),
      [],
      ['Paling Sedikit Tugas', 'ID Petugas', 'Tugas Selesai'],
      ...data.rankings.leastTasks.map((row) => [row.fullName, row.username, row.value]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Statistik_Operasional_${data.period.from}_${data.period.to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const visibleTrend = data.trend.slice(-14);
  const chartMax = Math.max(1, ...visibleTrend.flatMap((row) => [row.hadir, row.izin, row.tidakHadir]));
  const totalAttendance = data.summary.presentTotal + data.summary.permitTotal + data.summary.absentTotal;
  const presentPct = totalAttendance ? Math.round(data.summary.presentTotal / totalAttendance * 100) : 0;
  const permitPct = totalAttendance ? Math.round(data.summary.permitTotal / totalAttendance * 100) : 0;
  const absentPct = Math.max(0, 100 - presentPct - permitPct);

  const cards = [
    { label: 'Tingkat Kehadiran', value: `${data.summary.attendanceRate}%`, note: `${data.summary.presentTotal} dari ${data.summary.scheduledTotal} jadwal`, icon: bundledIcons.sudahAbsen, color: 'from-emerald-50 to-white', badge: 'text-emerald-700 bg-emerald-100' },
    { label: 'Total Tugas Selesai', value: data.summary.completedTasks, note: `${data.summary.totalTasks} tugas pada periode ini`, icon: bundledIcons.hariMasuk, color: 'from-blue-50 to-white', badge: 'text-blue-700 bg-blue-100' },
    { label: 'Rata-rata Tugas/Petugas', value: data.summary.averageTasks, note: 'Distribusi tugas petugas', icon: bundledIcons.performa, color: 'from-orange-50 to-white', badge: 'text-orange-700 bg-orange-100' },
    { label: 'Petugas Perlu Perhatian', value: data.summary.attentionOfficers, note: 'Memiliki ketidakhadiran', icon: bundledIcons.belumAbsen, color: 'from-rose-50 to-white', badge: 'text-rose-700 bg-rose-100' },
  ];

  return (
    <div className="space-y-4 pb-8">
      <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm lg:flex-row lg:items-end">
        <FilterField label="Tanggal Awal"><input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="filter-input" /></FilterField>
        <FilterField label="Tanggal Akhir"><input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="filter-input" /></FilterField>
        <FilterField label="Shift"><select value={filters.shift} onChange={(event) => setFilters({ ...filters, shift: event.target.value })} className="filter-input"><option value="">Semua Shift</option>{data.filters.shifts.map((shift) => <option key={shift}>{shift}</option>)}</select></FilterField>
        <FilterField label="Zona"><select value={filters.zone} onChange={(event) => setFilters({ ...filters, zone: event.target.value })} className="filter-input"><option value="">Semua Zona</option>{data.filters.zones.map((zone) => <option key={zone}>{zone}</option>)}</select></FilterField>
        <button onClick={applyFilters} disabled={loading} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-60"><Filter className="size-4" /> Terapkan Filter</button>
        <button onClick={exportCsv} disabled={loading} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-xs font-black text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"><Download className="size-4" /> Unduh Laporan</button>
      </section>

      {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><AlertTriangle className="size-4" />{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {cards.map((card) => <article key={card.label} className={cn('relative flex min-h-32 items-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br p-4 shadow-sm', card.color)}>
          <div className="relative size-20 shrink-0"><Image src={card.icon} alt="" fill sizes="80px" className="object-contain drop-shadow-md" /></div>
          <div className="min-w-0"><p className="text-xs font-bold text-zinc-500">{card.label}</p><p className="mt-1 text-3xl font-black text-zinc-950">{loading ? '—' : card.value}</p><span className={cn('mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-black', card.badge)}>{loading ? 'Memuat data' : card.note}</span></div>
        </article>)}
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.65fr_1fr]">
        <Panel title="Tren Kehadiran Petugas" subtitle={`Pergerakan kehadiran ${data.period.from} hingga ${data.period.to}`} icon={BarChart3} loading={loading}>
          {visibleTrend.length ? <div className="overflow-x-auto pb-1"><div className="flex h-64 min-w-[680px] items-end gap-2 border-b border-zinc-200 px-2 pt-7">{visibleTrend.map((row) => <div key={row.date} className="flex h-full min-w-10 flex-1 flex-col justify-end"><div className="flex h-[190px] items-end justify-center gap-1">{[[row.hadir, 'bg-emerald-500'], [row.izin, 'bg-blue-500'], [row.tidakHadir, 'bg-red-500']].map(([value, color], index) => <div key={index} className={cn('relative w-1/4 min-w-2 max-w-5 rounded-t', color)} style={{ height: `${Math.max(Number(value) ? 7 : 2, Number(value) / chartMax * 100)}%` }}><span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-zinc-500">{value}</span></div>)}</div><p className="py-2 text-center text-[9px] font-bold text-zinc-500">{new Date(`${row.date}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p></div>)}</div><Legend /></div> : <EmptyState text="Belum ada jadwal pada periode ini." />}
        </Panel>

        <Panel title="Ringkasan Absensi" subtitle={`Proporsi dari ${totalAttendance} catatan jadwal`} icon={CalendarDays} loading={loading}>
          <div className="flex min-h-64 flex-col items-center justify-center gap-7 sm:flex-row xl:flex-col 2xl:flex-row">
            <div className="relative size-44 shrink-0 rounded-full" style={{ background: `conic-gradient(#22c55e 0 ${presentPct}%,#3b82f6 ${presentPct}% ${presentPct + permitPct}%,#ef4444 ${presentPct + permitPct}% 100%)` }}><div className="absolute inset-10 flex flex-col items-center justify-center rounded-full bg-white shadow-inner"><strong className="text-2xl font-black">{totalAttendance}</strong><span className="text-[9px] text-zinc-400">Kehadiran</span></div></div>
            <div className="w-full space-y-3">{[['Hadir', data.summary.presentTotal, presentPct, 'bg-emerald-500'], ['Izin', data.summary.permitTotal, permitPct, 'bg-blue-500'], ['Tidak Hadir', data.summary.absentTotal, absentPct, 'bg-red-500']].map(([label, value, percent, color]) => <div key={String(label)} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-zinc-100 pb-3 text-xs"><span className="flex items-center gap-2 font-bold"><i className={cn('size-3 rounded-full', color)} />{label}</span><strong>{value}</strong><span className="w-9 text-right font-bold text-zinc-400">{percent}%</span></div>)}</div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <RankingPanel title="Paling Banyak Tidak Absen" subtitle="Perlu evaluasi kehadiran" rows={data.rankings.mostAbsent} tone="red" suffix="kali" loading={loading} />
        <RankingPanel title="Paling Banyak Tugas" subtitle="Produktivitas tugas tertinggi" rows={data.rankings.mostTasks} tone="green" suffix="tugas" loading={loading} />
        <RankingPanel title="Paling Sedikit Tugas" subtitle="Perlu pemerataan penugasan" rows={data.rankings.leastTasks} tone="orange" suffix="tugas" loading={loading} />
      </section>

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2"><Lightbulb className="size-5 text-amber-500" /><h2 className="font-black">Insight & Rekomendasi</h2></div>
        <div className="grid gap-3 lg:grid-cols-3">
          <Insight icon={TrendingUp} title={data.summary.attendanceRate >= 80 ? 'Kehadiran Terjaga' : 'Kehadiran Perlu Ditingkatkan'} text={`Tingkat kehadiran periode ini ${data.summary.attendanceRate}%. ${data.summary.attendanceRate >= 80 ? 'Pertahankan pemantauan rutin.' : 'Evaluasi petugas dengan ketidakhadiran tertinggi.'}`} tone="green" />
          <Insight icon={Users} title={`${data.summary.attentionOfficers} Petugas Perlu Perhatian`} text="Gunakan peringkat ketidakhadiran untuk pembinaan dan pemeriksaan kendala lapangan." tone="orange" />
          <Insight icon={ClipboardCheck} title="Distribusi Tugas" text={`Terdapat ${data.summary.totalTasks} tugas dengan rata-rata ${data.summary.averageTasks} tugas per petugas aktif bertugas.`} tone="blue" />
        </div>
      </section>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="min-w-0 flex-1"><span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-zinc-400">{label}</span>{children}</label>;
}

function Panel({ title, subtitle, icon: Icon, loading, children }: { title: string; subtitle: string; icon: React.ElementType; loading: boolean; children: React.ReactNode }) {
  return <article className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm"><header className="mb-3 flex items-start justify-between gap-3"><div className="flex gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="size-5" /></span><div><h2 className="font-black text-zinc-950">{title}</h2><p className="text-[10px] text-zinc-400">{subtitle}</p></div></div>{loading && <Loader2 className="size-4 animate-spin text-orange-500" />}</header>{children}</article>;
}

function RankingPanel({ title, subtitle, rows, tone, suffix, loading }: { title: string; subtitle: string; rows: Ranking[]; tone: 'red' | 'green' | 'orange'; suffix: string; loading: boolean }) {
  const colors = { red: { soft: 'bg-red-50', text: 'text-red-600', bar: 'bg-red-500' }, green: { soft: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500' }, orange: { soft: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500' } }[tone];
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <article className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm"><header className={cn('border-b border-zinc-100 p-4', colors.soft)}><h2 className="font-black">{title}</h2><p className="text-[10px] text-zinc-500">{subtitle}</p></header><div className="p-3">{loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="size-5 animate-spin text-orange-500" /></div> : rows.length ? rows.map((row, index) => <div key={row.id} className="grid grid-cols-[28px_38px_1fr] items-center gap-2 border-b border-zinc-100 py-2 last:border-0"><span className={cn('flex size-7 items-center justify-center rounded-full text-xs font-black', index < 3 ? `${colors.soft} ${colors.text}` : 'bg-zinc-100 text-zinc-500')}>{index + 1}</span><Avatar row={row} /><div className="min-w-0"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-black">{row.fullName}</p><p className="text-[9px] text-zinc-400">{row.username}</p></div><strong className={cn('whitespace-nowrap text-[10px]', colors.text)}>{row.value} {suffix}</strong></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className={cn('h-full rounded-full', colors.bar)} style={{ width: `${row.value ? Math.max(8, row.value / max * 100) : 0}%` }} /></div></div></div>) : <EmptyState text="Belum ada data pada periode ini." />}</div></article>;
}

function Avatar({ row }: { row: Ranking }) {
  return row.photoUrl ? <Image unoptimized src={row.photoUrl} alt="" width={36} height={36} className="size-9 rounded-full border border-orange-100 object-cover" /> : <span className="flex size-9 items-center justify-center rounded-full bg-orange-100 text-[10px] font-black text-orange-600">{row.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}</span>;
}

function Insight({ icon: Icon, title, text, tone }: { icon: React.ElementType; title: string; text: string; tone: 'green' | 'orange' | 'blue' }) {
  const styles = { green: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-600', blue: 'bg-blue-50 text-blue-600' }[tone];
  return <div className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3"><span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', styles)}><Icon className="size-5" /></span><div><h3 className="text-xs font-black">{title}</h3><p className="mt-1 text-[10px] leading-4 text-zinc-500">{text}</p></div></div>;
}

function EmptyState({ text }: { text: string }) { return <div className="flex min-h-44 items-center justify-center text-xs font-semibold text-zinc-400">{text}</div>; }
function Legend() { return <div className="mt-3 flex justify-center gap-5 text-[9px] font-bold text-zinc-500"><span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-emerald-500" />Hadir</span><span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-blue-500" />Izin</span><span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-red-500" />Tidak Hadir</span></div>; }
