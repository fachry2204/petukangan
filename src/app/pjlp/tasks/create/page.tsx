'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  MapPin, 
  ChevronLeft, 
  CheckCircle2, 
  Loader2, 
  SwitchCamera, 
  Clock,
  ShieldAlert,
  X
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiUrl } from '@/lib/api-config';
const MapComponent = dynamic(() => import('@/components/map-component'), { ssr: false });

export default function PjlpCreateTaskPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<string>('');

  // Camera states
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // GPS/Map states
  const [location, setLocation] = useState<any>(null);
  const [address, setAddress] = useState('Mengambil lokasi GPS...');
  const [isFetchingLocation, setIsFetchingLocation] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Running Server Clock & Date
  const [serverTime, setServerTime] = useState<string>('');
  const [serverDate, setServerDate] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      
      // Format Time (WIB, Asia/Jakarta)
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta'
      }) + ' WIB';

      // Format Date (Asia/Jakarta)
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      
      const formatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      const parts = formatter.formatToParts(now);
      const dayVal = parts.find(p => p.type === 'day')?.value || '';
      const monthVal = parts.find(p => p.type === 'month')?.value || '';
      const yearVal = parts.find(p => p.type === 'year')?.value || '';
      
      const d = new Date(parseInt(yearVal), parseInt(monthVal) - 1, parseInt(dayVal));
      const dateStr = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

      setServerTime(timeStr);
      setServerDate(dateStr);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Location automatically on mount — 2-step: cached first, then refine
  const watchIdRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLocationWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  const fetchLocation = async () => {
    setIsFetchingLocation(true);
    setLocation(null);
    setAddress('Mencari koordinat satelit...');
    
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'GPS Tidak Didukung',
        description: 'Perangkat Anda tidak mendukung geolocation GPS.'
      });
      setIsFetchingLocation(false);
      setAddress('GPS Tidak Didukung');
      return;
    }

    try {
      const pos: any = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 10000
        });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLocation({ lat, lng, isMock: pos.mocked || false });
      
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
          headers: { 'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8' }
        });
        const data = await response.json();
        setAddress(data.display_name || `Lokasi Petugas (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
      } catch (err) {
        setAddress(`Lokasi Petugas (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
      }
    } catch (err: any) {
      console.error('GPS error:', err);
      toast({
        variant: 'destructive',
        title: 'GPS Tidak Ditemukan',
        description: 'Tidak dapat mendapatkan lokasi. Pastikan izin GPS aktif.'
      });
      setAddress('Gagal mendapatkan lokasi GPS');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token || !user) {
      router.push('/login');
      return;
    }
    fetchLocation();

    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${apiUrl}/attendance/today`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const status = res.data.status || 'Belum Absen';
        setAttendanceStatus(status);
        if (status !== 'Sudah Absen' && status !== 'Selesai Istirahat') {
          toast({
            variant: 'destructive',
            title: 'Tidak Dapat Membuat Tugas',
            description: 'Anda harus dalam status Absen Masuk atau Selesai Istirahat untuk membuat tugas.'
          });
          router.push('/pjlp/home');
        }
      } catch (err) {
        console.error('Failed to fetch attendance status', err);
      }
    };
    fetchStatus();
  }, [isHydrated, token, user, router]);

  // Clean up camera stream + GPS watch + safety timer on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      clearLocationWatch();
    };
  }, []);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const enumerateVideoInputs = async () => {
    // Unused now but kept for compatibility
    return [];
  };

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
        if (e?.name === 'NotReadableError' && i < retries) {
          await sleep(400);
          continue;
        }
        throw e;
      }
    }
    throw lastErr;
  };

  const startCamera = async (opts: { mode?: 'user' | 'environment' } = {}) => {
    try {
      stopCamera();
      await sleep(150);
      setIsCapturing(true);

      const targetMode = opts.mode || facingMode;
      const stream = await tryGetUserMedia({ video: { facingMode: targetMode } });
      
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);

    } catch (err: any) {
      console.error('Camera access failed:', err);
      toast({
        variant: 'destructive',
        title: 'Kamera Gagal',
        description: 'Tidak dapat mengakses kamera Anda. Pastikan izin kamera telah diberikan.',
      });
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const toggleCameraFacing = async () => {
    stopCamera();
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Failed to toggle camera:', err);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvasEl = canvasRef.current;
      const videoEl = videoRef.current;
      const context = canvasEl.getContext('2d');
      if (context) {
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        context.drawImage(videoEl, 0, 0);

        // Upload to our API instead of using base64
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvasEl.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal memproses foto'))), 'image/jpeg', 0.9);
        });
        const formData = new FormData();
        formData.append('file', blob, `task-${Date.now()}.jpg`);
        formData.append('type', 'tugas');

        const uploadRes = await axios.post(`${apiUrl}/upload`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (uploadRes.data.success) {
          setPhoto(uploadRes.data.url);
        }
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    startCamera();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Judul Wajib Diisi',
        description: 'Silakan isi judul tugas mandiri Anda.'
      });
      return;
    }

    if (!photo) {
      toast({
        variant: 'destructive',
        title: 'Foto Wajib',
        description: 'Silakan ambil foto dokumentasi tugas mandiri.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(
        `${apiUrl}/tasks`,
        {
          title,
          description,
          photoUrl: photo,
          lat: location?.lat || null,
          lng: location?.lng || null,
          address: address || 'Lokasi Tugas',
          deadline: new Date().toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({
        title: 'Tugas Mandiri Ditambahkan',
        description: 'Tugas mandiri Anda berhasil dibuat dengan foto dan lokasi GPS.'
      });

      router.push('/pjlp/tasks');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Membuat Tugas',
        description: err.response?.data?.message || 'Terjadi kesalahan saat menyimpan tugas.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (attendanceStatus === 'Absen Istirahat' || attendanceStatus === 'Sudah Absen Pulang') {
    return (
      <div className="pb-24 min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 text-red-650 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wide">
            Akses Pembuatan Tugas Ditutup
          </h2>
          <p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed">
            {attendanceStatus === 'Absen Istirahat' 
              ? 'Anda saat ini sedang dalam status Absen Istirahat. Silakan selesaikan waktu istirahat Anda terlebih dahulu melalui menu Beranda sebelum dapat menambahkan tugas mandiri.'
              : 'Anda telah melakukan Absen Pulang hari ini. Akses pendaftaran tugas mandiri dinonaktifkan.'
            }
          </p>
          <Button 
            onClick={() => router.push('/pjlp/home')}
            className="w-full py-4.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs"
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header Container */}
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-900 px-6 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
        <button onClick={() => router.back()} className="flex items-center text-zinc-550 font-bold hover:text-zinc-700 active:scale-95 transition-all text-sm">
          <ChevronLeft className="w-5 h-5 mr-1" /> Kembali
        </button>
        <h2 className="text-base font-black text-zinc-900 dark:text-white uppercase">Tugas Mandiri Baru</h2>
        <div className="w-8" /> {/* Spacing */}
      </header>

      {/* Main Content Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-lg mx-auto text-left">
        
        {/* Dynamic Running Date & Time (At the top of form, below header) */}
        <div className="bg-orange-50/60 dark:bg-orange-950/10 border border-orange-100/80 dark:border-orange-900/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-0.5 flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-950/30 text-orange-650 dark:text-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black text-orange-550 dark:text-orange-500 uppercase tracking-wider leading-none">Tanggal & Waktu Saat Ini</p>
              <p className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-500 leading-tight mt-0.5">Terekam otomatis ke sistem</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-zinc-800 dark:text-white">{serverDate || 'Memuat tanggal...'}</p>
            <p className="text-sm font-black text-orange-600 dark:text-orange-550 tabular-nums">{serverTime || '00:00:00 WIB'}</p>
          </div>
        </div>

        {/* Title Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Judul Tugas Mandiri *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Pembersihan sisa dahan rubuh Jl. Cidodol"
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-855 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-zinc-800 dark:text-white shadow-sm"
          />
        </div>

        {/* Description Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Deskripsi Kegiatan</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan secara mendetail detail kegiatan pembersihan atau perbaikan..."
            className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-855 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-zinc-800 dark:text-white shadow-sm"
          />
        </div>

        {/* Camera capture section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Foto Sebelum Melakukan Tugas *</label>
          </div>

          <div 
            className="relative aspect-video rounded-3xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 shadow-inner cursor-pointer"
            onClick={() => { if (!photo && !isCapturing) startCamera(); }}
          >
            {photo ? (
              <img src={photo} alt="Task Capture" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <img src="/gambar/icon/camera.png" alt="Kamera" className="w-10 h-10 object-contain opacity-40" />
                <p className="text-xs text-zinc-500 font-bold">Klik untuk Aktifkan Kamera</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex gap-3">
            {photo && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleRetake} 
                className="w-full py-6 rounded-2xl font-bold border-zinc-300"
              >
                Ambil Ulang Foto
              </Button>
            )}
          </div>
        </div>

        {/* Fullscreen Camera Overlay (attendance-style) */}
        {isCapturing && (
          <div className="fixed inset-0 z-[10001] bg-black flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            {/* Top Controls */}
            <div className="p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent relative">
              <Button
                type="button"
                variant="ghost"
                onClick={stopCamera}
                className="text-white hover:bg-white/10 rounded-full w-10 h-10 p-0 flex items-center justify-center"
                aria-label="Tutup kamera"
              >
                <img src="/gambar/close.png" alt="Close" className="w-6 h-6 object-contain" />
              </Button>

              <Badge className="bg-orange-600 text-white font-bold border-none py-1.5 px-3 rounded-full flex items-center gap-1.5 animate-pulse">
                <Clock className="w-3.5 h-3.5" /> GPS AKTIF
              </Badge>

              <Button
                type="button"
                variant="ghost"
                onClick={toggleCameraFacing}
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
                  Arahkan Kamera ke Objek Tugas
                </p>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="p-8 z-50 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-4 relative">
              {/* Info pill */}
              <div className="bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center max-w-xs space-y-0.5">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                  <MapPin className="w-3 h-3" /> {location ? 'Akurasi GPS Tinggi' : 'Mencari GPS...'}
                </div>
                <p className="text-[10px] text-white/80 leading-normal truncate w-60">
                  {address || 'Menghubungkan posisi GPS...'}
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

        {/* GPS location section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Tagging Lokasi GPS Anda *</label>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={fetchLocation} 
              className="text-xs text-orange-500 hover:text-orange-600 font-bold h-8 px-2"
            >
              Ulangi GPS
            </Button>
          </div>

          <Card className="border-none shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Koordinat GPS Anda</p>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate leading-tight mt-0.5">
                  {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'Mencari lokasi GPS...'}
                </p>
                {location && (
                  <p className="text-[10px] text-zinc-500 leading-tight mt-1 line-clamp-2">
                    {address}
                  </p>
                )}
              </div>
              <Badge className="bg-green-100 text-green-600 border-none font-bold text-[9px]">Akurat</Badge>
            </CardContent>
          </Card>

          {/* Leaflet Map Widget */}
          <div className="h-44 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative shadow-inner">
            {location ? (
              <MapComponent 
                center={[location.lat, location.lng]} 
                zoom={16} 
                points={[{ lat: location.lat, lng: location.lng, name: 'Lokasi Anda', status: 'Lokasi Temuan Tugas' }]} 
              />
            ) : isFetchingLocation ? (
              <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center flex-col gap-2">
                <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                <p className="text-zinc-400 text-xs font-bold">Mencari koordinat satelit...</p>
              </div>
            ) : (
              <div className="w-full h-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center flex-col gap-2 p-4 text-center">
                <MapPin className="w-6 h-6 text-red-400" />
                <p className="text-red-500 text-xs font-bold">Gagal menemukan lokasi GPS</p>
                <p className="text-red-400/80 text-[10px]">Ketuk "Ulangi GPS" di atas untuk mencoba lagi.</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !location}
          className="w-full py-7 mt-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Simpan & Daftarkan Tugas Mandiri
            </>
          )}
        </Button>

      </form>
    </div>
  );
}
