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
  Clock,
  X,
  SwitchCamera
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api-config';

export default function PpsuTaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
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
      const res = await axios.get(`${apiUrl}/tasks/${id}`, {
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
        const res = await axios.get(`${apiUrl}/attendance/today`, {
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

  const stopCameraStream = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const enumerateVideoInputs = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videos);
      return videos;
    } catch (err) {
      console.error('enumerateDevices failed', err);
      return [] as MediaDeviceInfo[];
    }
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const tryGetUserMedia = async (
    constraints: MediaStreamConstraints,
    retries = 2,
  ): Promise<MediaStream> => {
    let lastErr: any = null;
    for (let i = 0; i <= retries; i++) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e: any) {
        lastErr = e;
        // NotReadableError commonly means the device wasn't fully released yet.
        if (e?.name === 'NotReadableError' && i < retries) {
          await sleep(400);
          continue;
        }
        throw e;
      }
    }
    throw lastErr;
  };

  const openCamera = async (
    opts: { deviceId?: string; mode?: 'user' | 'environment' } = {},
  ) => {
    try {
      stopCameraStream();
      // Give the OS a moment to release the previous device handle.
      await sleep(150);
      setIsCapturing(true);

      const constraints: MediaStreamConstraints = opts.deviceId
        ? { video: { deviceId: { exact: opts.deviceId } } }
        : { video: { facingMode: opts.mode || facingMode } };

      const stream = await tryGetUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Need a granted permission before labels/deviceIds are exposed in some browsers.
      const videos = await enumerateVideoInputs();
      if (opts.deviceId) {
        const idx = videos.findIndex((d) => d.deviceId === opts.deviceId);
        if (idx >= 0) setCurrentDeviceIndex(idx);
      }
    } catch (err: any) {
      const name = err?.name || 'Error';
      const message = err?.message || String(err);
      console.error('Failed to start camera:', name, message, err);

      let desc = 'Mohon izinkan akses kamera pada browser Anda.';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        desc = 'Izin kamera ditolak. Buka pengaturan situs di browser dan izinkan akses Kamera.';
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        desc = 'Kamera yang diminta tidak tersedia. Coba ganti ke kamera lain.';
      } else if (name === 'NotReadableError') {
        desc = 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut, lalu coba lagi.';
      } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        desc = 'Browser memblokir akses kamera karena situs tidak HTTPS. Buka via https atau localhost.';
      }

      toast({
        variant: 'destructive',
        title: `Kamera Tidak Dapat Diakses (${name})`,
        description: desc,
      });
      setIsCapturing(false);

      // If a deviceId-based open failed, retry with facingMode as a fallback once.
      if (opts.deviceId) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
          if (videoRef.current) videoRef.current.srcObject = stream;
          setIsCapturing(true);
        } catch (_) { /* swallow */ }
      }
    }
  };

  const closeCamera = () => {
    stopCameraStream();
    setIsCapturing(false);
  };

  const switchCamera = async () => {
    let devices = videoDevices;
    if (devices.length < 2) devices = await enumerateVideoInputs();

    if (devices.length < 2) {
      // Fallback: toggle facingMode if only one device is reported (mobile browsers).
      const next = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(next);
      await openCamera({ mode: next });
      return;
    }

    const nextIndex = (currentDeviceIndex + 1) % devices.length;
    setCurrentDeviceIndex(nextIndex);
    await openCamera({ deviceId: devices[nextIndex].deviceId });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        setPhoto(canvasRef.current.toDataURL('image/jpeg'));
        stopCameraStream();
        setIsCapturing(false);
      }
    }
  };

  const allowedTaskStatuses = ['Sudah Absen'];
  const canDoTask = allowedTaskStatuses.includes(attendanceStatus);

  const updateStatus = async (newStatus: string) => {
    if (!canDoTask) {
      setWarningReason(attendanceStatus);
      setIsWarningOpen(true);
      return;
    }

    // Photo required for: ARRIVED, NOT_STARTED, WORKING, VERIFY
    if (['ARRIVED', 'NOT_STARTED', 'WORKING', 'VERIFY'].includes(newStatus) && !photo) {
      const labelMap: Record<string, string> = {
        ARRIVED: 'Sampai Di Lokasi',
        NOT_STARTED: 'Belum Di Kerjakan',
        WORKING: 'Mulai Dikerjakan',
        VERIFY: 'Selesai Mengerjakan',
      };
      toast({ 
        variant: 'destructive', 
        title: 'Foto Wajib', 
        description: `Silakan ambil foto untuk status ${labelMap[newStatus] || newStatus}` 
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get current location — 2-step: cached fast, then refine
      let pos: any = null;
      try {
        // Step 1: Try cached/coarse position first (very fast)
        pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: false, timeout: 2000, maximumAge: Infinity
          });
        });
      } catch (coarseErr) {
        // Step 2: Fallback to high accuracy if cached failed
        pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true, timeout: 5000, maximumAge: 0
          });
        });
      }
      
      await axios.post(
        `${apiUrl}/tasks/${id}/status`,
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

      const statusLabelMap: Record<string, string> = {
        TASK_ACCEPTED: 'Tugas Diterima',
        ARRIVED: 'Sampai Di Lokasi',
        NOT_STARTED: 'Belum Di Kerjakan',
        WORKING: 'Mulai Dikerjakan',
        VERIFY: 'Menunggu Verifikasi Admin',
        DONE: 'Tugas Selesai',
      };
      toast({ 
        title: 'Status Diperbarui', 
        description: `Tugas sekarang ${statusLabelMap[newStatus] || newStatus}` 
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
      case 'TASK_NEW': return 'TUGAS BARU';
      case 'TASK_ACCEPTED': return 'TUGAS DITERIMA';
      case 'ARRIVED': return 'SAMPAI DI LOKASI';
      case 'NOT_STARTED': return 'BELUM DI KERJAKAN';
      case 'WORKING': return 'MULAI DI KERJAKAN';
      case 'VERIFY': return 'MENUNGGU VERIFIKASI';
      case 'DONE': return 'TUGAS SELESAI';
      default: return status;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'TASK_NEW': return 'bg-purple-100 text-purple-600';
      case 'TASK_ACCEPTED': return 'bg-blue-100 text-blue-600';
      case 'ARRIVED': return 'bg-indigo-100 text-indigo-600';
      case 'NOT_STARTED': return 'bg-red-100 text-red-600';
      case 'WORKING': return 'bg-orange-100 text-orange-600';
      case 'VERIFY': return 'bg-yellow-100 text-yellow-600';
      case 'DONE': return 'bg-green-100 text-green-600';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  return (
    <div className="pb-24 min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-6 pt-12 rounded-b-3xl shadow-sm border-b border-zinc-100 dark:border-zinc-800 text-left relative">
        {/* Floating exit/back icon button */}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Keluar / Kembali"
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 text-zinc-700 dark:text-zinc-200 flex items-center justify-center shadow-sm border border-zinc-200/80 dark:border-zinc-700/60 active:scale-95 transition"
        >
          <X className="w-5 h-5" />
        </button>
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
        {/* Info Lengkap Tugas */}
        <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
          <CardContent className="p-5 space-y-4">
            {/* 1. Tanggal Tugas */}
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Tanggal Tugas</p>
              <p className="text-sm font-bold text-zinc-800 dark:text-white">
                {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : new Date(task.createdAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* 2. Judul Tugas */}
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Judul Tugas</p>
              <p className="text-lg font-black text-zinc-900 dark:text-white leading-tight">{task.title}</p>
            </div>

            {/* 3. Deskripsi Tugas */}
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Deskripsi Tugas</p>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                {task.description || 'Tidak ada deskripsi untuk tugas ini.'}
              </p>
            </div>

            {/* 4. Prioritas Tugas */}
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Prioritas Tugas</p>
              <Badge className={`${
                task.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                task.priority === 'LOW' ? 'bg-blue-100 text-blue-700' :
                'bg-zinc-100 text-zinc-700'
              } border-none text-xs font-bold px-3 py-1`}>
                {task.priority || 'MEDIUM'}
              </Badge>
            </div>

            {/* 5. Petugas yang Ditugaskan */}
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Petugas yang Ditugaskan</p>
              <div className="flex items-center gap-2">
                {task.assignedTo?.photoUrl && (
                  <img src={task.assignedTo.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                )}
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  {task.assignedTo?.fullName || `Petugas #${task.assignedTo?.id ?? '-'}`}
                </p>
              </div>
            </div>

            {/* 6. Alamat Tugas */}
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1">Alamat Tugas</p>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-white">{task.address || 'Petukangan Utara'}</p>
                  {task.lat && task.lng && (
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      {Number(task.lat).toFixed(6)}, {Number(task.lng).toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 7. Tombol Lihat Lokasi (Google Maps) */}
            {task.lat && task.lng && (
              <a
                href={`https://www.google.com/maps?q=${task.lat},${task.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button
                  type="button"
                  className="w-full py-5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  Lihat Lokasi di Google Maps
                </Button>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Dynamic Camera capture depending on Status */}
        {task.status !== 'VERIFY' && task.status !== 'DONE' ? (
          <div className="space-y-4">
            {/* Photo capture for statuses that require photo */}
            {['TASK_ACCEPTED', 'ARRIVED', 'NOT_STARTED', 'WORKING'].includes(task.status) ? (
              <>
                <h3 className="font-black text-base text-zinc-800 dark:text-white uppercase tracking-wider text-[10px] text-zinc-400">
                  {task.status === 'TASK_ACCEPTED' ? 'Foto Sampai Di Lokasi (dengan GPS) *' :
                   task.status === 'ARRIVED' ? 'Foto Lokasi Belum Di Kerjakan *' :
                   task.status === 'NOT_STARTED' ? 'Foto Saat Mengerjakan *' :
                   'Foto Selesai Mengerjakan *'}
                </h3>
                
                <button
                  type="button"
                  onClick={() => { if (!photo) openCamera(); }}
                  className="relative w-full aspect-video rounded-3xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 shadow-inner cursor-pointer active:scale-[0.99] transition-transform"
                >
                  {photo ? (
                    <img src={photo} alt="Task state" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-zinc-50 dark:bg-zinc-900/50">
                      <img src="/gambar/icon/camera.png" alt="Kamera" className="w-10 h-10 object-contain opacity-40 animate-pulse" />
                      <p className="text-xs text-zinc-500 font-bold text-center px-4">
                        {task.status === 'TASK_ACCEPTED' ? 'Ambil foto saat sampai di lokasi tugas' :
                         task.status === 'ARRIVED' ? 'Ambil foto kondisi lokasi sebelum dikerjakan' :
                         task.status === 'NOT_STARTED' ? 'Ambil foto saat sedang mengerjakan tugas' :
                         'Ambil foto hasil tugas yang sudah selesai'}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-semibold">Ketuk untuk membuka kamera</p>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </button>

                {photo && (
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => { setPhoto(null); openCamera(); }} 
                      className="w-full py-6 rounded-2xl font-bold"
                    >
                      Ambil Ulang Foto
                    </Button>
                  </div>
                )}
              </>
            ) : null}

            {/* Active Action Button */}
            <div className="pt-2">
              {task.status === 'TASK_NEW' ? (
                <Button 
                  onClick={() => updateStatus('TASK_ACCEPTED')} 
                  disabled={isLoading || isCapturing} 
                  className="w-full py-6 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Terima Tugas
                </Button>
              ) : task.status === 'TASK_ACCEPTED' ? (
                <Button 
                  onClick={() => updateStatus('ARRIVED')} 
                  disabled={isLoading || isCapturing || !photo} 
                  className="w-full py-6 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                  Sampai Di Lokasi
                </Button>
              ) : task.status === 'ARRIVED' ? (
                <Button 
                  onClick={() => updateStatus('NOT_STARTED')} 
                  disabled={isLoading || isCapturing || !photo} 
                  className="w-full py-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  Upload Foto Lokasi
                </Button>
              ) : task.status === 'NOT_STARTED' ? (
                <Button 
                  onClick={() => updateStatus('WORKING')} 
                  disabled={isLoading || isCapturing || !photo} 
                  className="w-full py-6 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Mulai Dikerjakan
                </Button>
              ) : task.status === 'WORKING' ? (
                <Button 
                  onClick={() => updateStatus('VERIFY')} 
                  disabled={isLoading || isCapturing || !photo} 
                  className="w-full py-6 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Selesai Mengerjakan
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          /* Read-only verification state */
          <div className="space-y-4">
            <Card className="border-none shadow-sm rounded-3xl bg-green-50/70 dark:bg-green-950/10 border-2 border-green-100/50 dark:border-green-950/20 p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-green-800 dark:text-green-500 uppercase tracking-wider">Tugas Selesai Dikerjakan</h4>
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

      {/* Fullscreen Camera Overlay (attendance-style) */}
      {isCapturing && (
        <div className="fixed inset-0 z-[10001] bg-black flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
          {/* Top Controls */}
          <div className="p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent relative">
            <Button
              variant="ghost"
              onClick={closeCamera}
              className="text-white hover:bg-white/10 rounded-full w-10 h-10 p-0 flex items-center justify-center"
              aria-label="Tutup kamera"
            >
              <img src="/gambar/close.png" alt="Close" className="w-6 h-6 object-contain" />
            </Button>

            <Badge className="bg-orange-600 text-white font-bold border-none py-1.5 px-3 rounded-full flex items-center gap-1.5 animate-pulse">
              <Clock className="w-3.5 h-3.5" /> GPS AKTIF
            </Badge>

            <Button
              variant="ghost"
              onClick={switchCamera}
              className="text-white hover:bg-white/10 border border-white/20 px-3.5 py-1.5 h-auto rounded-xl flex items-center gap-1.5 text-[11px] font-black bg-black/30 backdrop-blur-sm"
            >
              <SwitchCamera className="w-3.5 h-3.5" /> Ganti Kamera
            </Button>
          </div>

          {/* Video Viewfinder */}
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Target frame */}
            <div className="absolute inset-x-12 inset-y-28 border border-dashed border-white/25 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="w-6 h-6 border-t-2 border-l-2 border-orange-500 absolute top-0 left-0 rounded-tl-lg" />
              <div className="w-6 h-6 border-t-2 border-r-2 border-orange-500 absolute top-0 right-0 rounded-tr-lg" />
              <div className="w-6 h-6 border-b-2 border-l-2 border-orange-500 absolute bottom-0 left-0 rounded-bl-lg" />
              <div className="w-6 h-6 border-b-2 border-r-2 border-orange-500 absolute bottom-0 right-0 rounded-br-lg" />
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center px-2">
                {task.status === 'TODO' ? 'Foto Sedang Mengerjakan' : 'Foto Bukti Selesai'}
              </p>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="p-8 z-50 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-4 relative">
            {/* Info pill */}
            <div className="bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center max-w-xs space-y-0.5">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                <MapPin className="w-3 h-3" /> Lokasi Tugas
              </div>
              <p className="text-[10px] text-white/80 leading-normal truncate w-60">
                {task.address || 'Petukangan Utara'}
              </p>
            </div>

            {/* Shutter */}
            <div className="flex items-center justify-center py-2">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-20 h-20 bg-orange-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center transition-all transform active:scale-90 hover:scale-105 active:bg-orange-700 overflow-hidden relative"
                aria-label="Ambil gambar"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 animate-ping absolute pointer-events-none" />
                <img src="/gambar/camera.png" alt="Shutter" className="w-10 h-10 object-contain" />
              </button>
            </div>
          </div>
        </div>
      )}

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
                      return 'Anda belum melakukan absen masuk hari ini. Silakan lakukan absen masuk melalui menu Beranda terlebih dahulu sebelum dapat memperbarui status tugas.';
                    case 'Menunggu Diterima':
                      return 'Permintaan absen Anda sedang menunggu persetujuan dari admin. Anda baru dapat melakukan tugas setelah permintaan disetujui.';
                    case 'Izin Tidak Masuk':
                      return 'Anda sedang dalam status izin tidak masuk hari ini. Anda tidak dapat memperbarui status tugas selama status ini.';
                    case 'Pulang Awal':
                      return 'Anda sudah melakukan pulang awal. Akses pembaruan status tugas telah dinonaktifkan.';
                    case 'Absen Istirahat':
                      return 'Anda saat ini sedang dalam status Absen Istirahat. Silakan selesaikan waktu istirahat Anda terlebih dahulu melalui menu Beranda sebelum dapat memperbarui status tugas.';
                    case 'Selesai Istirahat':
                      return 'Anda telah selesai istirahat tetapi belum melakukan absen masuk kembali. Silakan absen masuk melalui menu Beranda untuk melanjutkan tugas.';
                    case 'Sudah Absen Pulang':
                      return 'Anda telah menyelesaikan tugas hari ini dan melakukan Absen Pulang. Akses pembaruan status tugas dinonaktifkan.';
                    default:
                      return 'Saat ini Anda tidak dapat memperbarui status tugas. Pastikan status absen Anda sudah "Absen Masuk" untuk melakukan tugas.';
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
    </div>
  );
}
