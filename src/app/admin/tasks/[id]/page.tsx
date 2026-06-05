'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, ChevronLeft, ClipboardList, Pencil, Trash2, 
  ArrowUpRight, Loader2 
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api-config';

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
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const TASK_TYPE_LABEL: Record<string, string> = {
  ASSIGNED: 'Ditugaskan',
  SELF: 'Tugas Mandiri',
};

const TASK_TYPE_COLOR: Record<string, string> = {
  ASSIGNED: 'bg-orange-100 text-orange-700',
  SELF: 'bg-emerald-100 text-emerald-700',
};

export default function AdminTaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTask = async () => {
    try {
      const res = await axios.get(`${apiUrl}/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTask(res.data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Tidak dapat memuat detail tugas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) fetchTask();
  }, [id, token]);

  if (loading) return <div className="p-12 text-center text-sm font-bold text-zinc-400 animate-pulse">Memuat detail tugas...</div>;
  if (!task) return <div className="p-12 text-center text-sm font-bold text-zinc-400">Tugas tidak ditemukan.</div>;

  return (
    <div className="pb-8 min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-6 pt-8 rounded-b-3xl shadow-sm border-b border-zinc-100 dark:border-zinc-800">
        <button onClick={() => router.push('/admin/tasks')} className="mb-4 flex items-center text-zinc-550 font-black hover:text-zinc-700 transition-all text-sm active:scale-95">
          <ChevronLeft className="w-5 h-5 mr-1" /> Kembali ke Daftar Tugas
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h2 className="text-2xl font-black text-zinc-800 dark:text-white leading-tight">{task.title}</h2>
            <div className="flex items-center gap-1.5 text-zinc-450 dark:text-zinc-550 text-xs">
              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="truncate font-semibold">{task.address || 'Petukangan Utara'}</span>
            </div>
          </div>
          <Badge className={`${STATUS_COLOR[task.status] || 'bg-zinc-100 text-zinc-700'} border-none text-[10px] font-black uppercase flex-shrink-0 px-2.5 py-1`}>
            {STATUS_LABEL[task.status] || task.status}
          </Badge>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={`${STATUS_COLOR[task.status] || 'bg-zinc-100 text-zinc-700'} border-none font-bold text-xs px-3 py-1`}>
            {STATUS_LABEL[task.status] || task.status}
          </Badge>
          <Badge className={`${PRIORITY_COLOR[task.priority || 'MEDIUM']} border-none font-bold text-xs px-3 py-1`}>
            Prioritas: {task.priority || 'MEDIUM'}
          </Badge>
          <Badge className={`${TASK_TYPE_COLOR[task.taskType || 'ASSIGNED']} border-none font-bold text-xs px-3 py-1`}>
            {TASK_TYPE_LABEL[task.taskType || 'ASSIGNED']}
          </Badge>
        </div>

        {/* Photo */}
        {task.photoUrl && (
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <img
              src={task.photoUrl}
              alt="Foto tugas"
              className="w-full max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(task.photoUrl, '_blank')}
            />
          </Card>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Petugas</p>
            <div className="flex items-center gap-2">
              {task.assignedTo?.photoUrl && (
                <img src={task.assignedTo.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              )}
              <p className="font-semibold text-zinc-900 dark:text-white">
                {task.assignedTo?.fullName || `Petugas #${task.assignedTo?.id ?? '-'}`}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Jenis Tugas</p>
            <p className="font-semibold text-zinc-900 dark:text-white">{TASK_TYPE_LABEL[task.taskType || 'ASSIGNED']}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Deadline</p>
            <p className="font-semibold text-zinc-900 dark:text-white">
              {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Zona</p>
            <p className="font-semibold text-zinc-900 dark:text-white">{task.zone?.name || '-'}</p>
          </div>
        </div>

        {/* Description */}
        <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
          <CardContent className="p-5 space-y-2">
            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Deskripsi Tugas</p>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {task.description || 'Tidak ada deskripsi untuk tugas ini.'}
            </p>
          </CardContent>
        </Card>

        {/* Lokasi */}
        <Card className="border-none shadow-sm rounded-2xl bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-blue-400 mb-2">Lokasi Tugas</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono font-semibold text-zinc-900 dark:text-white">
                  {task.lat && task.lng ? `${Number(task.lat).toFixed(6)}, ${Number(task.lng).toFixed(6)}` : '—'}
                </p>
                {task.address && <p className="text-sm text-zinc-500 mt-0.5">{task.address}</p>}
              </div>
              {task.lat && task.lng && (
                <a
                  href={`https://www.google.com/maps?q=${task.lat},${task.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                    <MapPin className="w-4 h-4 mr-1" /> Maps
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-xs text-zinc-400">
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-sm">
            <p className="font-bold text-zinc-500">Dibuat</p>
            <p>{task.createdAt ? new Date(task.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-sm">
            <p className="font-bold text-zinc-500">Diperbarui</p>
            <p>{task.updatedAt ? new Date(task.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => router.push(`/admin/tasks/edit/${task.id}`)}
            className="flex-1 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20"
          >
            <Pencil className="w-4 h-4 mr-2" /> Edit Tugas
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/tasks')}
            className="flex-1 py-5 rounded-2xl font-bold text-sm"
          >
            Kembali
          </Button>
        </div>
      </div>
    </div>
  );
}
