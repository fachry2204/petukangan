'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  MapPin, 
  ChevronLeft, 
  CheckCircle2, 
  Loader2, 
  Play, 
  ShieldAlert,
  Clock
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';

export default function PpsuTaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<string>('Belum Absen');
  const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);
  const [warningReason, setWarningReason] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { token } = useAuthStore();
  const { toast } = useToast();

  const fetchTask = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTask(res.data);
    } catch (error) {
      console.error('Failed to fetch task', error);
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/attendance/today`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAttendanceStatus(res.data.status || 'Belum Absen');
      } catch (err) {
        console.error('Failed to fetch attendance status', err);
      }
    };
    if (token && id) {
      fetchTask();
      fetchStatus();
    }
  }, [id, token]);

  const startCamera = async () => {
    setIsCapturing(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        setPhoto(canvasRef.current.toDataURL('image/jpeg'));
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setIsCapturing(false);
      }
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (attendanceStatus === 'Absen Istirahat' || attendanceStatus === 'Sudah Absen Pulang') {
      setWarningReason(attendanceStatus);
      setIsWarningOpen(true);
      return;
    }

    if (['WORKING', 'VERIFY'].includes(newStatus) && !photo) {
      toast({ 
        variant: 'destructive', 
        title: 'Foto Wajib', 
        description: `Silakan ambil foto untuk status ${newStatus === 'WORKING' ? 'Sedang Dikerjakan' : 'Tugas Selesai'}` 
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get current location
      const pos: any = await new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 });
      });
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/tasks/${id}/status`,
        {
          status: newStatus,
          photo: photo,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: task.address || 'Lokasi Tugas',
          note: `Update status ke ${newStatus}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({ 
        title: 'Status Diperbarui', 
        description: `Tugas sekarang ${newStatus === 'WORKING' ? 'Sedang Dikerjakan' : 'Menunggu Verifikasi'}` 
      });
      router.push('/ppsu/tasks');
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Gagal', 
        description: error.response?.data?.message || 'Gagal memperbarui status tugas' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return <div className="p-12 text-center text-sm font-bold text-zinc-400 animate-pulse">Memuat tugas...</div>;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'TODO': return 'MULAI DIKERJAKAN';
      case 'WORKING': return 'SEDANG DIKERJAKAN';
      case 'VERIFY': return 'MENUNGGU VERIFIKASI';
      case 'DONE': return 'SELESAI';
      default: return status;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-zinc-100 text-zinc-700';
      case 'WORKING': return 'bg-orange-100 text-orange-655';
      case 'VERIFY': return 'bg-yellow-100 text-yellow-650';
      case 'DONE': return 'bg-green-100 text-green-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  return (
    <div className="pb-24 min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-6 pt-12 rounded-b-3xl shadow-sm border-b border-zinc-100 dark:border-zinc-800 text-left">
        <button onClick={() => router.back()} className="mb-4 flex items-center text-zinc-550 font-black hover:text-zinc-700 transition-all text-sm active:scale-95">
          <ChevronLeft className="w-5 h-5 mr-1" /> Kembali
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h2 className="text-2xl font-black text-zinc-800 dark:text-white leading-tight">{task.title}</h2>
            <div className="flex items-center gap-1.5 text-zinc-450 dark:text-zinc-550 text-xs">
              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="truncate font-semibold">{task.address || 'Petukangan Utara'}</span>
            </div>
          </div>
          <Badge className={`${getStatusBadgeColor(task.status)} border-none text-[10px] font-black uppercase flex-shrink-0 px-2.5 py-1`}>
            {getStatusLabel(task.status)}
          </Badge>
        </div>
      </div>

      <div className="p-6 space-y-6 text-left">
        {/* Description Card */}
        <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
          <CardContent className="p-4 space-y-2">
            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Deskripsi Tugas</p>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {task.description || 'Tidak ada deskripsi deskriptif untuk tugas ini.'}
            </p>
          </CardContent>
        </Card>

        {/* Dynamic Camera capture depending on Status */}
        {task.status !== 'VERIFY' && task.status !== 'DONE' ? (
          <div className="space-y-4">
            <h3 className="font-black text-base text-zinc-800 dark:text-white uppercase tracking-wider text-[10px] text-zinc-400">
              {task.status === 'TODO' ? 'Foto Sedang Mengerjakan Tugas *' : 'Foto Tugas Selesai *'}
            </h3>
            
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 shadow-inner">
              {photo ? (
                <img src={photo} alt="Task state" className="w-full h-full object-cover" />
              ) : isCapturing ? (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-zinc-50 dark:bg-zinc-900/50">
                  <img src="/gambar/icon/camera.png" alt="Kamera" className="w-10 h-10 object-contain opacity-40 animate-pulse" />
                  <p className="text-xs text-zinc-500 font-bold">
                    {task.status === 'TODO' ? 'Ambil foto Anda sedang mengerjakan tugas' : 'Ambil foto bukti tugas selesai'}
                  </p>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-3">
              {isCapturing ? (
                <Button 
                  onClick={capturePhoto} 
                  className="w-full py-6 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-md shadow-orange-500/10"
                >
                  Ambil Gambar
                </Button>
              ) : photo ? (
                <Button 
                  variant="outline" 
                  onClick={() => setPhoto(null)} 
                  className="w-full py-6 rounded-2xl font-bold"
                >
                  Ambil Ulang Foto
                </Button>
              ) : (
                <Button 
                  onClick={startCamera} 
                  className="w-full py-6 bg-zinc-900 text-white hover:bg-zinc-850 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <img src="/gambar/icon/camera.png" alt="Kamera" className="w-5 h-5 object-contain" />
                  Buka Kamera HP
                </Button>
              )}
            </div>

            {/* Active Action Button directly below the photo button */}
            <div className="pt-2">
              {task.status === 'TODO' ? (
                <Button 
                  onClick={() => updateStatus('WORKING')} 
                  disabled={isLoading || isCapturing} 
                  className="w-full py-6 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Simpan & Mulai Dikerjakan
                </Button>
              ) : task.status === 'WORKING' ? (
                <Button 
                  onClick={() => updateStatus('VERIFY')} 
                  disabled={isLoading || isCapturing} 
                  className="w-full py-6 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Simpan & Selesaikan Tugas
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          /* Read-only verification state */
          <div className="space-y-4">
            <Card className="border-none shadow-sm rounded-3xl bg-yellow-50/70 dark:bg-yellow-950/10 border-2 border-yellow-100/50 dark:border-yellow-950/20 p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-950/30 text-yellow-650 dark:text-yellow-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-yellow-800 dark:text-yellow-500 uppercase tracking-wider">Status Tugas Menunggu Verifikasi</h4>
                <p className="text-xs font-semibold text-zinc-550 dark:text-zinc-400 leading-relaxed">
                  Tugas telah selesai dikerjakan! Saat ini sedang dalam tahap **verifikasi administrasi** oleh Pimpinan, Staff, dan Administrator kelurahan.
                </p>
              </div>
            </Card>
            <Button 
              disabled 
              className="w-full py-6 bg-zinc-200 dark:bg-zinc-850 text-zinc-450 dark:text-zinc-550 rounded-2xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-5 h-5" />
              Menunggu Verifikasi Pimpinan
            </Button>
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
                {warningReason === 'Absen Istirahat' ? 'Sedang Waktu Istirahat!' : 'Sudah Absen Pulang!'}
              </h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed">
                {warningReason === 'Absen Istirahat' 
                  ? 'Anda saat ini sedang dalam status Absen Istirahat. Silakan selesaikan waktu istirahat Anda terlebih dahulu melalui menu Beranda sebelum dapat mengambil atau memperbarui status tugas.'
                  : 'Anda telah menyelesaikan tugas hari ini dan melakukan Absen Pulang. Akses pengerjaan dan pembaruan status tugas dinonaktifkan.'
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
