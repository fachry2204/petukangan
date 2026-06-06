'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, Pencil, Loader2, Save 
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { apiUrl, authHeaders } from '@/lib/api-config';

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

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const TASK_TYPES = ['ASSIGNED', 'SELF'];

export default function AdminTaskEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: 'MEDIUM',
    taskType: 'ASSIGNED',
    deadline: '',
  });

  const fetchTask = async () => {
    try {
      const res = await axios.get(`${apiUrl}/tasks/${id}`, {
        headers: authHeaders(token)
      });
      const t = res.data;
      setForm({
        title: t.title || '',
        description: t.description || '',
        status: t.status || '',
        priority: t.priority || 'MEDIUM',
        taskType: t.taskType || 'ASSIGNED',
        deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 10) : '',
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Tidak dapat memuat data tugas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) fetchTask();
  }, [id, token]);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert('Judul tugas wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${apiUrl}/tasks/${id}`, {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        taskType: form.taskType,
        deadline: form.deadline || null,
      }, { headers: authHeaders(token) });
      toast({ title: 'Berhasil', description: 'Tugas berhasil diperbarui' });
      router.push(`/admin/tasks/${id}`);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: err.response?.data?.message || 'Gagal menyimpan perubahan' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-sm font-bold text-zinc-400 animate-pulse">Memuat data tugas...</div>;

  return (
    <div className="pb-8 min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-6 pt-8 rounded-b-3xl shadow-sm border-b border-zinc-100 dark:border-zinc-800">
        <button onClick={() => router.push(`/admin/tasks/${id}`)} className="mb-4 flex items-center text-zinc-550 font-black hover:text-zinc-700 transition-all text-sm active:scale-95">
          <ChevronLeft className="w-5 h-5 mr-1" /> Kembali ke Detail
        </button>
        <h2 className="text-2xl font-black text-zinc-800 dark:text-white leading-tight flex items-center gap-2">
          <Pencil className="w-6 h-6 text-orange-500" />
          Edit Tugas
        </h2>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
          <CardContent className="p-6 space-y-5">
            {/* Judul */}
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Judul Tugas</label>
              <Input
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Judul tugas..."
                className="mt-1 rounded-xl"
              />
            </div>

            {/* Deskripsi */}
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Deskripsi</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Deskripsi tugas..."
                className="mt-1 min-h-[100px] rounded-xl"
              />
            </div>

            {/* Status, Prioritas, Jenis, Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                >
                  {Object.keys(STATUS_LABEL).map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Prioritas</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="mt-1 w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Jenis Tugas</label>
                <select
                  value={form.taskType}
                  onChange={(e) => setForm(f => ({ ...f, taskType: e.target.value }))}
                  className="mt-1 w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                >
                  {TASK_TYPES.map((tt) => (
                    <option key={tt} value={tt}>{tt === 'ASSIGNED' ? 'Ditugaskan' : 'Tugas Mandiri'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Deadline</label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Perubahan
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/tasks/${id}`)}
            className="flex-1 py-5 rounded-2xl font-bold text-sm"
          >
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}
