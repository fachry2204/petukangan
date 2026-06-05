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
  ShieldAlert,
  Map
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiUrl } from '@/lib/api-config';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const MapComponent = dynamic(() => import('@/components/map-component'), {
  ssr: false,
  loading: () => <div className="w-full h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
});

export default function PpsuTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [attendanceStatus, setAttendanceStatus] = useState<string>('Belum Absen');
  const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);
  const [warningReason, setWarningReason] = useState<string>('');
  const [mapModalOpen, setMapModalOpen] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const { token } = useAuthStore();
  const router = useRouter();

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
      case 'TASK_NEW': return 'bg-purple-100 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400';
      case 'NOT_STARTED': return 'bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400';
      case 'WORKING': return 'bg-orange-100 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400';
      case 'VERIFY': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950/20 dark:text-yellow-400';
      case 'DONE': return 'bg-green-100 text-green-600 dark:bg-green-950/20 dark:text-green-400';
      default: return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'HIGH': return 'bg-red-50 text-red-600 border-none text-[9px] font-bold';
      case 'MEDIUM': return 'bg-yellow-50 text-yellow-600 border-none text-[9px] font-bold';
      default: return 'bg-zinc-50 text-zinc-500 border-none text-[9px] font-bold';
    }
  };

  const allowedTaskStatuses = ['Sudah Absen'];
  const canDoTask = allowedTaskStatuses.includes(attendanceStatus);

  const handleCreateClick = () => {
    if (!canDoTask) {
      setWarningReason(attendanceStatus);
      setIsWarningOpen(true);
    } else {
      router.push('/ppsu/tasks/create');
    }
  };

  const handleTaskClick = (e: React.MouseEvent, taskId: number) => {
    if (!canDoTask) {
      e.preventDefault();
      setWarningReason(attendanceStatus);
      setIsWarningOpen(true);
    } else {
      router.push(`/ppsu/tasks/${taskId}`);
    }
  };

  const handleMapClick = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    setSelectedTask(task);
    setMapModalOpen(true);
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

      {/* Tasks List - Table Layout */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-zinc-400 text-xs font-bold">Memuat tugas...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardList className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-zinc-800 dark:text-white mb-1">Belum Ada Tugas</p>
            <p className="text-xs text-zinc-550 mb-4">
              Anda tidak memiliki disposisi dari staff pimpinan atau tugas mandiri hari ini.
            </p>
            <Button
              onClick={handleCreateClick}
              variant="outline"
              className="text-xs font-bold rounded-xl text-orange-600 border-orange-200 dark:border-zinc-800 hover:bg-orange-50/50"
            >
              Buat Tugas Mandiri Pertama Anda
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
                  <TableHead className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Tugas</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Status</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Prioritas</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Lokasi</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Tanggal</TableHead>
                  <TableHead className="text-xs font-bold text-zinc-600 dark:text-zinc-400 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer transition-colors"
                    onClick={(e) => handleTaskClick(e, task.id)}
                  >
                    <TableCell className="py-3">
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate max-w-[200px]">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 max-w-[200px]">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge className={`${getStatusColor(task.status)} border-none text-[9px] font-black`}>
                        {task.status === 'TODO' ? 'MULAI DIKERJAKAN' :
                         task.status === 'WORKING' ? 'SEDANG DIKERJAKAN' :
                         task.status === 'VERIFY' ? 'MENUNGGU VERIFIKASI' :
                         task.status === 'DONE' ? 'SELESAI' : task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      {task.taskType === 'SELF' ? (
                        <Badge className="bg-orange-50 text-orange-550 border-none text-[9px] font-bold dark:bg-orange-950/20">
                          Tugas Mandiri
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-50 text-blue-600 border-none text-[9px] font-bold dark:bg-blue-950/20">
                          Tugas dari Admin
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[150px]">
                          {task.address || 'Petukangan Utara'}
                        </span>
                        <button
                          onClick={(e) => handleMapClick(e, task)}
                          className="p-1.5 bg-orange-50 dark:bg-orange-950/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
                        >
                          <Map className="w-3.5 h-3.5 text-orange-500" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                        <img src="/gambar/icon/calender.png" alt="Tanggal" className="w-3.5 h-3.5 object-contain" />
                        <span className="font-semibold">
                          {new Date(task.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <ArrowRight className="w-4 h-4 text-zinc-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
                {(() => {
                  switch (warningReason) {
                    case 'Belum Absen': return 'Belum Absen Masuk!';
                    case 'Menunggu Diterima': return 'Permintaan Menunggu Persetujuan!';
                    case 'Izin Tidak Masuk': return 'Status Izin Tidak Masuk!';
                    case 'Pulang Awal': return 'Sudah Pulang Awal!';
                    case 'Absen Istirahat': return 'Sedang Waktu Istirahat!';
                    case 'Selesai Istirahat': return 'Selesai Istirahat!';
                    case 'Sudah Absen Pulang': return 'Sudah Absen Pulang!';
                    default: return 'Tidak Dapat Melakukan Tugas!';
                  }
                })()}
              </h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed">
                {(() => {
                  switch (warningReason) {
                    case 'Belum Absen':
                      return 'Anda belum melakukan absen masuk hari ini. Silakan lakukan absen masuk melalui menu Beranda terlebih dahulu sebelum dapat menambahkan atau mengerjakan tugas.';
                    case 'Menunggu Diterima':
                      return 'Permintaan absen Anda sedang menunggu persetujuan dari admin. Anda baru dapat melakukan tugas setelah permintaan disetujui.';
                    case 'Izin Tidak Masuk':
                      return 'Anda sedang dalam status izin tidak masuk hari ini. Anda tidak dapat menambahkan atau mengerjakan tugas selama status ini.';
                    case 'Pulang Awal':
                      return 'Anda sudah melakukan pulang awal. Akses pengerjaan dan pendaftaran tugas mandiri telah dinonaktifkan.';
                    case 'Absen Istirahat':
                      return 'Anda saat ini sedang dalam status Absen Istirahat. Silakan selesaikan waktu istirahat Anda terlebih dahulu melalui menu Beranda sebelum dapat mengambil atau menambahkan tugas.';
                    case 'Selesai Istirahat':
                      return 'Anda telah selesai istirahat tetapi belum melakukan absen masuk kembali. Silakan absen masuk melalui menu Beranda untuk melanjutkan tugas.';
                    case 'Sudah Absen Pulang':
                      return 'Anda telah menyelesaikan tugas hari ini dan melakukan Absen Pulang. Akses pengerjaan dan pendaftaran tugas mandiri dinonaktifkan.';
                    default:
                      return 'Saat ini Anda tidak dapat menambahkan atau mengerjakan tugas. Pastikan status absen Anda sudah "Absen Masuk" untuk melakukan tugas.';
                  }
                })()}
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

      {/* Map Modal */}
      {mapModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-2xl overflow-hidden bg-white/95 dark:bg-zinc-950/95 border border-white/20 dark:border-zinc-800/80 rounded-3xl shadow-2xl text-left">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white">Lokasi Tugas</h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold">{selectedTask.title}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMapModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ArrowRight className="w-4 h-4 rotate-[-45deg]" />
              </Button>
            </div>
            <div className="h-80">
              {selectedTask.lat && selectedTask.lng ? (
                <MapComponent
                  points={[{
                    id: `task-${selectedTask.id}`,
                    lat: Number(selectedTask.lat),
                    lng: Number(selectedTask.lng),
                    name: selectedTask.title,
                    status: selectedTask.status,
                    photoUrl: null,
                    isSOS: false
                  }]}
                  center={[Number(selectedTask.lat), Number(selectedTask.lng)]}
                  zoom={16}
                  showPopup={true}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                  <MapPin className="w-12 h-12 mb-2" />
                  <p className="text-sm font-semibold">Lokasi GPS belum tersedia</p>
                  <p className="text-xs">Alamat: {selectedTask.address || 'Petukangan Utara'}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              {selectedTask.lat && selectedTask.lng && (
                <Button
                  onClick={() => {
                    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${selectedTask.lat},${selectedTask.lng}`;
                    window.open(googleMapsUrl, '_blank');
                  }}
                  variant="outline"
                  className="w-full py-3 text-orange-600 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Map className="w-4 h-4" />
                  Lihat di Google Maps
                </Button>
              )}
              <Button
                onClick={() => setMapModalOpen(false)}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs"
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
