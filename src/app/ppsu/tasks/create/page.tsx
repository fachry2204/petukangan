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
  ShieldAlert
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
const MapComponent = dynamic(() => import('@/components/map-component'), { ssr: false });

export default function PpsuCreateTaskPage() {
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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch Location automatically on mount
  const fetchLocation = () => {
    setIsFetchingLocation(true);
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'GPS Tidak Didukung',
        description: 'Perangkat Anda tidak mendukung geolocation GPS.'
      });
      setIsFetchingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        setAddress(`Lokasi Petugas (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
        setIsFetchingLocation(false);
      },
      (err) => {
        console.error('Failed to get location:', err);
        toast({
          variant: 'destructive',
          title: 'Gagal Mendapatkan GPS',
          description: 'Harap aktifkan izin lokasi GPS pada browser Anda.'
        });
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
        setAttendanceStatus(res.data.status || 'Belum Absen');
      } catch (err) {
        console.error('Failed to fetch attendance status', err);
      }
    };
    fetchStatus();
  }, [token]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (mode: 'user' | 'environment' = 'environment') => {
    try {
      stopCamera();
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access failed:', err);
      toast({
        variant: 'destructive',
        title: 'Kamera Gagal',
        description: 'Tidak dapat mengakses kamera Anda.'
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

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isCapturing) {
      startCamera(nextMode);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    startCamera(facingMode);
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

      router.push('/ppsu/tasks');
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
            onClick={() => router.push('/ppsu/home')}
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
            {isCapturing && (
              <Button 
                type="button"
                variant="outline"
                onClick={toggleCameraFacing}
                className="h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border-zinc-200 hover:bg-zinc-100"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                {facingMode === 'user' ? 'Kamera Belakang' : 'Kamera Depan'}
              </Button>
            )}
          </div>

          <div className="relative aspect-video rounded-3xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 shadow-inner">
            {photo ? (
              <img src={photo} alt="Task Capture" className="w-full h-full object-cover" />
            ) : isCapturing ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-zinc-50 dark:bg-zinc-900/50">
                <img src="/gambar/icon/camera.png" alt="Kamera" className="w-10 h-10 object-contain opacity-40" />
                <p className="text-xs text-zinc-500 font-bold">Foto Sebelum Melakukan Tugas</p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex gap-3">
            {isCapturing ? (
              <Button 
                type="button" 
                onClick={capturePhoto} 
                className="w-full py-6 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-md shadow-orange-500/10"
              >
                Ambil Gambar
              </Button>
            ) : photo ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleRetake} 
                className="w-full py-6 rounded-2xl font-bold"
              >
                Ambil Ulang Foto
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={() => startCamera(facingMode)} 
                className="w-full py-6 bg-zinc-900 text-white hover:bg-zinc-855 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <img src="/gambar/icon/camera.png" alt="Kamera" className="w-5 h-5 object-contain" />
                Aktifkan Kamera
              </Button>
            )}
          </div>
        </div>

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
            ) : (
              <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center flex-col gap-2">
                <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                <p className="text-zinc-400 text-xs font-bold">Mencari koordinat satelit...</p>
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
