'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import {
  Plus, Search, MapPin, Calendar, ClipboardList, Filter,
  RefreshCw, User2, AlertCircle, Eye, Pencil, Trash2, Loader2, Map as MapIcon, Download, FileText
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api-config';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TaskItem {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  taskType?: string;
  deadline?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  photoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  assignedTo?: { id: number; fullName?: string; photoUrl?: string } | null;
  zone?: { id: number; name?: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  TASK_NEW: 'Tugas Baru',
  TASK_ACCEPTED: 'Tugas Diterima',
  ARRIVED: 'Sampai Di Lokasi',
  NOT_STARTED: 'Belum Di Kerjakan',
  WORKING: 'Mulai Di Kerjakan',
  VERIFY: 'Menunggu Verifikasi',
  DONE: 'Tugas Selesai',
  CANCELLED: 'Dibatalkan',
};

const STATUS_COLOR: Record<string, string> = {
  TASK_NEW: 'bg-purple-100 text-purple-700',
  TASK_ACCEPTED: 'bg-blue-100 text-blue-700',
  ARRIVED: 'bg-indigo-100 text-indigo-700',
  NOT_STARTED: 'bg-red-100 text-red-700',
  WORKING: 'bg-orange-100 text-orange-700',
  VERIFY: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-zinc-100 text-zinc-700',
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'bg-zinc-100 text-zinc-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const TASK_TYPE_LABEL: Record<string, string> = {
  ASSIGNED: 'Ditugaskan',
  SELF: 'Tugas Mandiri',
};

const TASK_TYPE_COLOR: Record<string, string> = {
  ASSIGNED: 'bg-orange-100 text-orange-700',
  SELF: 'bg-emerald-100 text-emerald-700',
};

const TASK_TYPES = ['ASSIGNED', 'SELF'];

export default function AdminTasksPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dialog states
  const [viewTask, setViewTask] = useState<TaskItem | null>(null);
  const [editTask, setEditTask] = useState<TaskItem | null>(null);
  const [deleteTask, setDeleteTask] = useState<TaskItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', status: 'NOT_STARTED', priority: 'MEDIUM', taskType: 'ASSIGNED', deadline: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exportOfficer, setExportOfficer] = useState('ALL');

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchTasks = async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await axios.get(`${apiUrl}/tasks`, { headers: authHeaders });
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error('Failed to fetch tasks', e);
      setErr(e?.response?.data?.message || e.message || 'Gagal memuat tugas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Realtime updates for tasks
  useRealtime((event) => {
    if (event.entity === 'task') {
      toast({
        title: 'Data Tugas Diperbarui',
        description: `Tugas ${event.action === 'create' ? 'baru ditambahkan' : event.action === 'update' ? 'diperbarui' : 'dihapus'}`,
      });
      fetchTasks();
    }
  }, ['task']);

  const openEdit = (t: TaskItem) => {
    setEditTask(t);
    setEditForm({
      title: t.title || '',
      description: t.description || '',
      status: t.status || 'NOT_STARTED',
      priority: t.priority || 'MEDIUM',
      taskType: t.taskType || 'ASSIGNED',
      deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 10) : '',
    });
  };

  const submitEdit = async () => {
    if (!editTask) return;
    if (!editForm.title.trim()) {
      alert('Judul tugas wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.put(`${apiUrl}/tasks/${editTask.id}`, {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        priority: editForm.priority,
        taskType: editForm.taskType,
        deadline: editForm.deadline || null,
      }, { headers: authHeaders });

      // Optimistic update in list
      setTasks((prev) => prev.map((t) => t.id === editTask.id ? { ...t, ...res.data } : t));
      setEditTask(null);
    } catch (e: any) {
      console.error('Failed to update task', e);
      alert(e?.response?.data?.message || 'Gagal menyimpan perubahan tugas.');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTask) return;
    setDeleting(true);
    try {
      await axios.delete(`${apiUrl}/tasks/${deleteTask.id}`, { headers: authHeaders });
      setTasks((prev) => prev.filter((t) => t.id !== deleteTask.id));
      setDeleteTask(null);
    } catch (e: any) {
      console.error('Failed to delete task', e);
      alert(e?.response?.data?.message || 'Gagal menghapus tugas.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

    return tasks.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && (t.taskType || 'ASSIGNED') !== typeFilter) return false;
      if (q) {
        const hay = `${t.title || ''} ${t.description || ''} ${t.assignedTo?.fullName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const ts = t.createdAt ? new Date(t.createdAt) : null;
      if (from && ts && ts < from) return false;
      if (to && ts && ts > to) return false;
      return true;
    }).sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [tasks, search, statusFilter, typeFilter, dateFrom, dateTo]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: tasks.length };
    for (const t of tasks) c[t.status] = (c[t.status] || 0) + 1;
    return c;
  }, [tasks]);

  const uniqueOfficers = useMemo(() => {
    const map = new Map<number, string>();
    tasks.forEach(t => {
      if (t.assignedTo) map.set(t.assignedTo.id, t.assignedTo.fullName || `Petugas #${t.assignedTo.id}`);
    });
    return Array.from(map.entries()).map(([id, name]: [number, string]) => ({ id, name })).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [tasks]);

  const getExportData = () => {
    let data = tasks;
    if (exportDateFrom) {
      const from = new Date(exportDateFrom + 'T00:00:00');
      data = data.filter(t => t.createdAt && new Date(t.createdAt) >= from);
    }
    if (exportDateTo) {
      const to = new Date(exportDateTo + 'T23:59:59');
      data = data.filter(t => t.createdAt && new Date(t.createdAt) <= to);
    }
    if (exportOfficer !== 'ALL') {
      data = data.filter(t => t.assignedTo?.id === Number(exportOfficer));
    }
    return data.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  };

  const handleExportExcel = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast({ title: 'Kosong', description: 'Tidak ada data untuk diexport', variant: 'destructive' });
      return;
    }
    const excelData = data.map(t => ({
      'Tanggal': t.createdAt ? new Date(t.createdAt).toLocaleDateString('id-ID') : '-',
      'Petugas': t.assignedTo?.fullName || '-',
      'Judul Tugas': t.title,
      'Deskripsi': t.description || '-',
      'Status': STATUS_LABEL[t.status] || t.status,
      'Prioritas': t.priority || 'MEDIUM',
      'Jenis Tugas': TASK_TYPE_LABEL[t.taskType || 'ASSIGNED'] || t.taskType,
      'Zona': t.zone?.name || '-',
      'Koordinat': (t.lat && t.lng) ? `${t.lat}, ${t.lng}` : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    
    const colWidths = [
      { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 40 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }
    ];
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tugas_Lapangan');
    XLSX.writeFile(wb, `Laporan_Tugas_Lapangan.xlsx`);
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast({ title: 'Kosong', description: 'Tidak ada data untuk diexport', variant: 'destructive' });
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text('Laporan Tugas Lapangan (PPSU)', 14, 15);
    
    let subtitle = '';
    if (exportDateFrom || exportDateTo) {
      subtitle += `Periode: ${exportDateFrom || '-'} s/d ${exportDateTo || '-'}  `;
    }
    if (exportOfficer !== 'ALL') {
      const officerName = uniqueOfficers.find((o: any) => o.id === Number(exportOfficer))?.name;
      subtitle += `Petugas: ${officerName}`;
    }
    doc.setFontSize(10);
    doc.text(subtitle, 14, 22);

    const tableData = data.map(t => [
      t.createdAt ? new Date(t.createdAt).toLocaleDateString('id-ID') : '-',
      t.assignedTo?.fullName || '-',
      t.title,
      STATUS_LABEL[t.status] || t.status,
      t.priority || 'MEDIUM',
      TASK_TYPE_LABEL[t.taskType || 'ASSIGNED'] || t.taskType,
      t.zone?.name || '-'
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Tanggal', 'Petugas', 'Judul Tugas', 'Status', 'Prioritas', 'Jenis', 'Zona']],
      body: tableData as any,
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22] }, // orange-500
      styles: { fontSize: 8 }
    });

    doc.save('Laporan_Tugas_Lapangan.pdf');
    setIsExportOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-orange-500" /> Tugas Lapangan
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manajemen penugasan dan monitoring progres pekerjaan PPSU.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)} className="gap-1.5 border-green-200 hover:bg-green-50 hover:text-green-600 text-green-600">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
          <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/tasks/new">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
              <Plus className="w-4 h-4" />
              Tugaskan PPSU
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Cari Tugas / Petugas</label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kata kunci..." className="pl-8" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Status Tugas</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
              <option value="ALL">Semua Status ({counts.ALL || 0})</option>
              {Object.keys(STATUS_LABEL).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]} ({counts[s] || 0})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Jenis Tugas</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
              <option value="ALL">Semua Jenis</option>
              {TASK_TYPES.map((tt) => (
                <option key={tt} value={tt}>{TASK_TYPE_LABEL[tt]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Tanggal Mulai</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Tanggal Akhir</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
          </div>
        </div>
      </Card>

      {/* Task List */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            Daftar Tugas
            <span className="text-zinc-400 font-normal">({filtered.length})</span>
          </h3>
        </div>

        {err ? (
          <div className="p-8 text-center text-sm text-red-500 flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            {err}
          </div>
        ) : loading && tasks.length === 0 ? (
          <div className="p-12 text-center text-sm text-zinc-400">Memuat data tugas...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-zinc-400 italic">
            {tasks.length === 0
              ? 'Belum ada tugas yang ditugaskan. Klik "Tugaskan PPSU" untuk membuat tugas baru.'
              : 'Tidak ada tugas yang cocok dengan filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-zinc-100">
                  <TableHead className="w-[120px]">Tanggal Tugas</TableHead>
                  <TableHead>Judul Tugas</TableHead>
                  <TableHead>Nama Petugas</TableHead>
                  <TableHead>Koordinat</TableHead>
                  <TableHead>Status Tugas</TableHead>
                  <TableHead>Prioritas</TableHead>
                  <TableHead>Jenis Tugas</TableHead>
                  <TableHead className="text-right w-[140px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const statusKey = t.status || 'NOT_STARTED';
                  const statusColor = STATUS_COLOR[statusKey] || 'bg-zinc-100 text-zinc-700';
                  const priorityColor = PRIORITY_COLOR[t.priority || 'MEDIUM'] || 'bg-zinc-100 text-zinc-700';
                  const taskTypeColor = TASK_TYPE_COLOR[t.taskType || 'ASSIGNED'] || 'bg-zinc-100 text-zinc-700';
                  return (
                    <TableRow key={t.id} className="border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="text-zinc-500 text-sm">
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString('id-ID') : '-'}
                      </TableCell>
                      <TableCell className="font-bold text-zinc-950">{t.title}</TableCell>
                      <TableCell className="text-zinc-600 font-medium">
                        {t.assignedTo?.fullName || `Petugas #${t.assignedTo?.id ?? '-'}`}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-xs">
                        {t.lat && t.lng ? (
                          <div className="flex items-center gap-2">
                            <span>{Number(t.lat).toFixed(5)}, {Number(t.lng).toFixed(5)}</span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600"
                            >
                              <MapIcon className="w-4 h-4" />
                            </a>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColor} border-none font-bold text-[10px]`}>
                          {STATUS_LABEL[statusKey] || statusKey}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${priorityColor} border-none font-semibold text-[10px]`}>
                          {t.priority || 'MEDIUM'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${taskTypeColor} border-none font-semibold text-[10px]`}>
                          {TASK_TYPE_LABEL[t.taskType || 'ASSIGNED']}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/admin/tasks/${t.id}`)}
                            className="h-8 w-8 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/admin/tasks/edit/${t.id}`)}
                            className="h-8 w-8 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTask(t)}
                            className="h-8 w-8 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewTask} onOpenChange={(o) => !o && setViewTask(null)}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="w-6 h-6 text-orange-500" />
              Detail Tugas Lapangan
            </DialogTitle>
            <DialogDescription>Informasi lengkap tugas dari petugas lapangan.</DialogDescription>
          </DialogHeader>
          {viewTask && (
            <div className="space-y-4 text-sm">
              {/* Status Section */}
              <div className="flex flex-wrap gap-2">
                <Badge className={`${STATUS_COLOR[viewTask.status] || 'bg-zinc-100 text-zinc-700'} border-none font-bold text-xs px-3 py-1`}>
                  {STATUS_LABEL[viewTask.status] || viewTask.status}
                </Badge>
                <Badge className={`${PRIORITY_COLOR[viewTask.priority || 'MEDIUM']} border-none font-bold text-xs px-3 py-1`}>
                  Prioritas: {viewTask.priority || 'MEDIUM'}
                </Badge>
                <Badge className={`${TASK_TYPE_COLOR[viewTask.taskType || 'ASSIGNED']} border-none font-bold text-xs px-3 py-1`}>
                  {TASK_TYPE_LABEL[viewTask.taskType || 'ASSIGNED']}
                </Badge>
              </div>

              {/* Title */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Judul Tugas</p>
                <p className="font-bold text-lg">{viewTask.title}</p>
              </div>

              {/* Description */}
              {viewTask.description && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Deskripsi</p>
                  <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">{viewTask.description}</p>
                </div>
              )}

              {/* Photo Section */}
              {viewTask.photoUrl && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">Foto Tugas</p>
                  <div className="relative rounded-xl overflow-hidden border border-zinc-200">
                    <img
                      src={viewTask.photoUrl}
                      alt="Foto tugas"
                      className="w-full max-h-80 object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => viewTask.photoUrl && window.open(viewTask.photoUrl, '_blank')}
                    />
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Petugas Ditugaskan</p>
                  <div className="flex items-center gap-2">
                    {viewTask.assignedTo?.photoUrl && (
                      <img src={viewTask.assignedTo.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    )}
                    <p className="font-semibold text-zinc-900 dark:text-white">
                      {viewTask.assignedTo?.fullName || `Petugas #${viewTask.assignedTo?.id ?? '-'}`}
                    </p>
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Jenis Tugas</p>
                  <p className="font-semibold text-zinc-900 dark:text-white">{TASK_TYPE_LABEL[viewTask.taskType || 'ASSIGNED']}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Deadline</p>
                  <p className="font-semibold text-zinc-900 dark:text-white">{viewTask.deadline ? new Date(viewTask.deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Zona</p>
                  <p className="font-semibold text-zinc-900 dark:text-white">{viewTask.zone?.name || '-'}</p>
                </div>
                <div className="col-span-2 md:col-span-3">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Lokasi</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {viewTask.lat && viewTask.lng ? `${Number(viewTask.lat).toFixed(6)}, ${Number(viewTask.lng).toFixed(6)}` : '—'}
                    </p>
                    {viewTask.lat && viewTask.lng && (
                      <a
                        href={`https://www.google.com/maps?q=${viewTask.lat},${viewTask.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Buka di Maps
                      </a>
                    )}
                  </div>
                  {viewTask.address && <p className="text-xs text-zinc-500 mt-0.5">{viewTask.address}</p>}
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Dibuat</p>
                  <p className="font-semibold text-zinc-900 dark:text-white text-xs">{viewTask.createdAt ? new Date(viewTask.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Diperbarui</p>
                  <p className="font-semibold text-zinc-900 dark:text-white text-xs">{viewTask.updatedAt ? new Date(viewTask.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTask(null)}>Tutup</Button>
            {viewTask && viewTask.lat && viewTask.lng && (
              <a
                href={`https://www.google.com/maps?q=${viewTask.lat},${viewTask.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="gap-1.5">
                  <MapPin className="w-4 h-4" /> Buka di Maps
                </Button>
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-500" />
              Edit Tugas
            </DialogTitle>
            <DialogDescription>Perbarui informasi tugas lapangan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Judul</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Judul tugas..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Deskripsi</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Deskripsi tugas..."
                className="mt-1 min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full h-10 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                >
                  {Object.keys(STATUS_LABEL).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Prioritas</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                  className="mt-1 w-full h-10 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Jenis Tugas</label>
                <select
                  value={editForm.taskType}
                  onChange={(e) => setEditForm((f) => ({ ...f, taskType: e.target.value }))}
                  className="mt-1 w-full h-10 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                >
                  {TASK_TYPES.map((tt) => (
                    <option key={tt} value={tt}>{TASK_TYPE_LABEL[tt]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Deadline</label>
                <Input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTask(null)} disabled={saving}>Batal</Button>
            <Button onClick={submitEdit} disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTask} onOpenChange={(o) => !o && setDeleteTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Hapus Tugas?
            </DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Tugas dan riwayat log-nya akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          {deleteTask && (
            <div className="text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg p-3">
              <p className="font-bold">{deleteTask.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Petugas: {deleteTask.assignedTo?.fullName || '—'} · Status: {STATUS_LABEL[deleteTask.status] || deleteTask.status}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTask(null)} disabled={deleting}>Batal</Button>
            <Button onClick={submitDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white gap-1.5">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              Export Data Tugas
            </DialogTitle>
            <DialogDescription>
              Pilih rentang tanggal dan petugas untuk diexport.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-zinc-500">Nama Petugas</label>
              <select
                value={exportOfficer}
                onChange={(e) => setExportOfficer(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm focus:ring-2 focus:ring-green-500/30"
              >
                <option value="ALL">Semua Petugas</option>
                {uniqueOfficers.map((o: any) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-500">Tanggal Mulai</label>
                <Input type="date" value={exportDateFrom} onChange={(e) => setExportDateFrom(e.target.value)} className="mt-1 border-zinc-200 dark:border-zinc-800 focus-visible:ring-green-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500">Tanggal Akhir</label>
                <Input type="date" value={exportDateTo} onChange={(e) => setExportDateTo(e.target.value)} className="mt-1 border-zinc-200 dark:border-zinc-800 focus-visible:ring-green-500" />
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setIsExportOpen(false)}>Batal</Button>
            <div className="flex gap-2">
              <Button onClick={handleExportPDF} className="bg-red-500 hover:bg-red-600 text-white gap-2">
                <FileText className="w-4 h-4" /> PDF
              </Button>
              <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                <FileText className="w-4 h-4" /> Excel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
