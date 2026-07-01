'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, ChevronLeft, ClipboardList, Pencil, Trash2, 
  ArrowUpRight, Loader2, CheckCircle2, XCircle, ShieldAlert
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api-config';
import { useRealtime } from '@/hooks/use-realtime';

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
  const [verifying, setVerifying] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectStatus, setRejectStatus] = useState('NOT_STARTED');
  const [rejecting, setRejecting] = useState(false);

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

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await axios.put(`${apiUrl}/tasks/${id}`, { status: 'DONE' }, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Berhasil', description: 'Tugas telah diverifikasi dan diselesaikan' });
      fetchTask();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: err.response?.data?.message || 'Gagal memverifikasi tugas' });
    } finally {
      setVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Alasan penolakan wajib diisi' });
      return;
    }
    setRejecting(true);
    try {
      await axios.put(`${apiUrl}/tasks/${id}`, {
        status: rejectStatus,
        rejectionReason: rejectReason
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Berhasil', description: `Tugas dikembalikan ke status ${STATUS_LABEL[rejectStatus] || rejectStatus}` });
      setRejectModalOpen(false);
      setRejectReason('');
      fetchTask();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: err.response?.data?.message || err.response?.data?.error || 'Gagal menolak tugas' });
    } finally {
      setRejecting(false);
    }
  };

  useEffect(() => {
    if (token && id) fetchTask();
  }, [id, token]);

  // Realtime updates without page refresh
  useRealtime((event) => {
    if (event.entity === 'task' && event.data?.id === Number(id)) {
      fetchTask();
    }
  }, ['task']);

  if (loading) return <div className="p-12 text-center text-sm font-bold text-zinc-400 animate-pulse">Memuat detail tugas...</div>;
  if (!task) return <div className="p-12 text-center text-sm font-bold text-zinc-400">Tugas tidak ditemukan.</div>;

  const getTaskLogLabel = (status: string) => {
    switch (status) {
      case 'TASK_NEW': return 'Sebelum Dikerjakan';
      case 'TASK_ACCEPTED': return 'Tugas Diterima';
      case 'ARRIVED': return 'Sampai Di Lokasi';
      case 'NOT_STARTED': return 'Belum Di Kerjakan';
      case 'WORKING': return 'Mulai Dikerjakan';
      case 'VERIFY': return 'Menunggu Verifikasi';
      case 'DONE': return 'Diverifikasi Admin';
      default: return status;
    }
  };

  const normalizeAddress = (address: any) => {
    const a = typeof address === 'string' ? address.trim() : '';
    if (!a) return null;
    if (/^lokasi:/i.test(a)) return null;
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(a)) return null;
    return a;
  };

  const taskLogs: any[] = Array.isArray(task?.logs) ? task.logs : [];
  const logsWithPhoto = taskLogs
    .filter((l: any) => !!l?.photoUrl)
    .slice()
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
  if (task?.photoUrl) {
    logsWithPhoto.unshift({
      id: `initial-${task?.id}`,
      status: 'TASK_NEW',
      photoUrl: task.photoUrl,
      lat: task.lat,
      lng: task.lng,
      address: task.address,
      createdAt: task.createdAt
    });
  }

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

        {/* Bukti Foto Berdasarkan Status (untuk admin) */}
        <div>
          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2">Bukti Foto Berdasarkan Status</p>
          {logsWithPhoto.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 font-semibold">
              Belum ada foto bukti yang diunggah untuk tugas ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {logsWithPhoto.map((log: any) => (
                <div
                  key={log.id || `${log.status}-${log.createdAt}`}
                  className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden"
                >
                  <div className="p-3 flex items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800">
                    <Badge className={`${STATUS_COLOR[log.status] || 'bg-zinc-100 text-zinc-700'} border-none text-[10px] font-black uppercase px-2 py-0.5`}>
                      {getTaskLogLabel(log.status)}
                    </Badge>
                    <span className="text-[10px] font-bold text-zinc-400 whitespace-nowrap">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingPhoto(log.photoUrl)}
                    className="w-full bg-zinc-950/5 dark:bg-black/30"
                  >
                    <img
                      src={log.photoUrl}
                      alt={getTaskLogLabel(log.status)}
                      className="w-full h-44 object-cover"
                    />
                  </button>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 border-none font-black text-[9px] px-2 py-0.5 uppercase">
                        GPS
                      </Badge>
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 font-mono truncate">
                        {log.lat != null && log.lng != null ? `${Number(log.lat).toFixed(6)}, ${Number(log.lng).toFixed(6)}` : '-'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 border-none font-black text-[9px] px-2 py-0.5 uppercase shrink-0">
                        Alamat
                      </Badge>
                      <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold leading-relaxed">
                        {normalizeAddress(log.address) || 'Alamat belum tersedia'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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

        {/* Verification Actions — only show when status is VERIFY */}
        {task.status === 'VERIFY' && (
          <Card className="border-none shadow-sm rounded-2xl bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-200 dark:border-yellow-900/30">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-yellow-600" />
                <p className="text-sm font-black text-yellow-800 dark:text-yellow-500 uppercase tracking-wider">Verifikasi Tugas</p>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Tugas ini sedang menunggu verifikasi. Pilih <b>Setujui</b> untuk menyelesaikan tugas, atau <b>Tolak</b> untuk mengembalikan ke petugas dengan alasan.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex-1 py-5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-500/20"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Setujui & Selesaikan
                </Button>
                <Button
                  onClick={() => setRejectModalOpen(true)}
                  variant="outline"
                  className="flex-1 py-5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-2xl font-bold text-sm"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Tolak
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejection Reason Display */}
        {task.rejectionReason && (
          <Card className="border-none shadow-sm rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
            <CardContent className="p-5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-red-500 mb-1">Alasan Penolakan Terakhir</p>
              <p className="text-sm font-semibold text-red-800 dark:text-red-400">{task.rejectionReason}</p>
            </CardContent>
          </Card>
        )}

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

      {/* Photo Viewer */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setViewingPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            ×
          </button>
          <img
            src={viewingPhoto}
            alt="Foto bukti"
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-xl"
          />
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-6 h-6" />
              <h3 className="text-lg font-black">Tolak Verifikasi</h3>
            </div>
            <p className="text-sm text-zinc-500">
              Tugas akan dikembalikan ke petugas untuk diperbaiki. Pilih status pengembalian dan berikan alasan.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Kembalikan ke Status</label>
                <select
                  value={rejectStatus}
                  onChange={(e) => setRejectStatus(e.target.value)}
                  className="mt-1 w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                >
                  <option value="NOT_STARTED">Sebelum Mengerjakan</option>
                  <option value="WORKING">Saat Mengerjakan</option>
                  <option value="VERIFY">Selesai Mengerjakan</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Alasan Penolakan</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Jelaskan mengapa tugas ditolak dan apa yang perlu diperbaiki..."
                  className="mt-1 w-full min-h-[100px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleReject}
                disabled={rejecting}
                className="flex-1 py-5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm"
              >
                {rejecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                Tolak & Kembalikan
              </Button>
              <Button
                variant="outline"
                onClick={() => { setRejectModalOpen(false); setRejectReason(''); }}
                className="flex-1 py-5 rounded-2xl font-bold text-sm"
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
