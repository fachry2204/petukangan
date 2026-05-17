'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  Plus, 
  Loader2,
  ShieldAlert
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PpsuTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [attendanceStatus, setAttendanceStatus] = useState<string>('Belum Absen');
  const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);
  const [warningReason, setWarningReason] = useState<string>('');
  const { token } = useAuthStore();
  const router = useRouter();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${apiUrl}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${apiUrl}/attendance/today`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAttendanceStatus(res.data.status || 'Belum Absen');
      } catch (err) {
        console.error('Failed to fetch attendance status', err);
      }
    };
    if (token) {
      fetchTasks();
      fetchStatus();
    }
  }, [token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-300';
      case 'WORKING': return 'bg-orange-100 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400';
      case 'VERIFY': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-955/20 dark:text-yellow-400';
      case 'DONE': return 'bg-green-100 text-green-600 dark:bg-green-950/20 dark:text-green-400';
      default: return 'bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400';
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'HIGH': return 'bg-red-50 text-red-600 border-none text-[9px] font-bold';
      case 'MEDIUM': return 'bg-yellow-50 text-yellow-600 border-none text-[9px] font-bold';
      default: return 'bg-zinc-50 text-zinc-500 border-none text-[9px] font-bold';
    }
  };

  const handleCreateClick = () => {
    if (attendanceStatus === 'Absen Istirahat' || attendanceStatus === 'Sudah Absen Pulang') {
      setWarningReason(attendanceStatus);
      setIsWarningOpen(true);
    } else {
      router.push('/ppsu/tasks/create');
    }
  };

  const handleTaskClick = (e: React.MouseEvent, taskId: number) => {
    if (attendanceStatus === 'Absen Istirahat' || attendanceStatus === 'Sudah Absen Pulang') {
      e.preventDefault();
      setWarningReason(attendanceStatus);
      setIsWarningOpen(true);
    } else {
      router.push(`/ppsu/tasks/${taskId}`);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header Area */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Daftar Tugas</h2>
          <p className="text-sm text-zinc-550">Kelola tugas mandiri & disposisi staff</p>
        </div>
        <Button 
          onClick={handleCreateClick}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl p-3 shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 font-bold"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">Tugas Baru</span>
        </Button>
      </header>

      {/* Tasks List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-zinc-400 text-xs font-bold">Memuat tugas...</p>
          </div>
        ) : tasks.length === 0 ? (
          <Card className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center bg-white dark:bg-zinc-900/40">
            <CardContent className="p-0 space-y-3">
              <ClipboardList className="w-12 h-12 text-zinc-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-800 dark:text-white">Belum Ada Tugas</p>
                <p className="text-xs text-zinc-550 leading-relaxed max-w-[240px] mx-auto">
                  Anda tidak memiliki disposisi dari staff pimpinan atau tugas mandiri hari ini.
                </p>
              </div>
              <Button 
                onClick={handleCreateClick}
                variant="outline" 
                className="mt-2 text-xs font-bold rounded-xl text-orange-600 border-orange-200 dark:border-zinc-800 hover:bg-orange-50/50"
              >
                Buat Tugas Mandiri Pertama Anda
              </Button>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <div 
              key={task.id} 
              onClick={(e) => handleTaskClick(e, task.id)}
              className="cursor-pointer"
            >
              <Card className="border-none shadow-sm rounded-2xl overflow-hidden hover:ring-2 hover:ring-orange-500/20 transition-all active:scale-[0.98] bg-white dark:bg-zinc-900">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${getStatusColor(task.status)} border-none text-[9px] font-black`}>
                          {task.status === 'TODO' ? 'MULAI DIKERJAKAN' :
                           task.status === 'WORKING' ? 'SEDANG DIKERJAKAN' :
                           task.status === 'VERIFY' ? 'MENUNGGU VERIFIKASI' :
                           task.status === 'DONE' ? 'SELESAI' : task.status}
                        </Badge>
                        {/* Hide Priority badge completely if it is a self-created task */}
                        {task.priority !== 'SELF' && (
                          <Badge className={getPriorityBadge(task.priority)}>
                            {task.priority}
                          </Badge>
                        )}
                        {task.priority === 'SELF' && (
                          <Badge className="bg-orange-50 text-orange-550 border-none text-[9px] font-bold dark:bg-orange-950/20">
                            Tugas Mandiri
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-black text-base text-zinc-805 dark:text-white leading-tight truncate">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-zinc-450 dark:text-zinc-500 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="w-8 h-8 bg-zinc-50 dark:bg-zinc-850 rounded-full flex items-center justify-center flex-shrink-0 self-center">
                      <ArrowRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-3 border-t border-zinc-50 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                      <span className="truncate font-medium">
                        {task.address || 'Petukangan Utara'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <img src="/gambar/icon/calender.png" alt="Tanggal" className="w-3.5 h-3.5 object-contain" />
                      <span className="font-semibold">
                        {new Date(task.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Premium Glassmorphic Warning Modal */}
      {isWarningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm overflow-hidden bg-white/95 dark:bg-zinc-950/95 border border-white/20 dark:border-zinc-800/80 rounded-3xl shadow-2xl p-6 text-center space-y-4 transform scale-100 transition-all duration-300 text-left">
            <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-950/30 text-red-650 rounded-2xl flex items-center justify-center animate-bounce">
              <ShieldAlert className="w-7 h-7 text-red-500" />
            </div>
            
            <div className="space-y-1.5 text-center">
              <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wide">
                {warningReason === 'Absen Istirahat' ? 'Sedang Waktu Istirahat!' : 'Sudah Absen Pulang!'}
              </h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed">
                {warningReason === 'Absen Istirahat' 
                  ? 'Anda saat ini sedang dalam status Absen Istirahat. Silakan selesaikan waktu istirahat Anda terlebih dahulu melalui menu Beranda sebelum dapat mengambil atau menambahkan tugas.'
                  : 'Anda telah menyelesaikan tugas hari ini dan melakukan Absen Pulang. Akses pengerjaan dan pendaftaran tugas mandiri dinonaktifkan.'
                }
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <Button 
                onClick={() => {
                  setIsWarningOpen(false);
                  router.push('/ppsu/home');
                }}
                className="flex-1 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs"
              >
                Ke Beranda
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsWarningOpen(false)}
                className="flex-1 py-5 rounded-xl font-bold text-xs border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
