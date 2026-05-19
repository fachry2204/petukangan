'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  X,
  Sparkles
} from 'lucide-react';
import dynamic from 'next/dynamic';
const MapComponent = dynamic(() => import('@/components/map-component'), { ssr: false });
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


export default function PpsuAttendancePage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<string>('Belum Absen');
  const [hasApprovedRequest, setHasApprovedRequest] = useState<boolean>(false);
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [fetchingStatus, setFetchingStatus] = useState<boolean>(true);
  const [showFullMap, setShowFullMap] = useState<boolean>(false);
  
  // Camera & GPS Activation states
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string>('');
  const [successModalData, setSuccessModalData] = useState<{isOpen: boolean, title: string, desc: string}>({isOpen: false, title: '', desc: ''});

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Cleanup camera stream
  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const calculateDurations = (records: any[]) => {
    if (!records || records.length === 0) return { workStr: '-', breakStr: '-' };
    
    const inRec = records.find(r => r.type === 'IN');
    const breakRec = records.find(r => r.type === 'BREAK');
    const endBreakRec = records.find(r => r.type === 'END_BREAK');
    const outRec = records.find(r => r.type === 'OUT');
    
    let breakMs = 0;
    let breakStr = '-';
    
    if (breakRec) {
      const breakStart = new Date(breakRec.timestamp).getTime();
      const breakEnd = endBreakRec 
        ? new Date(endBreakRec.timestamp).getTime() 
        : (outRec ? new Date(outRec.timestamp).getTime() : new Date().getTime());
      
      if (breakEnd > breakStart) {
        breakMs = breakEnd - breakStart;
        const totalMinutes = Math.floor(breakMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours > 0) {
          breakStr = `${hours} Jam ${minutes} Menit`;
        } else {
          breakStr = `${minutes} Menit`;
        }
      }
    }
    
    let workStr = '-';
    if (inRec) {
      const workStart = new Date(inRec.timestamp).getTime();
      const workEnd = outRec 
        ? new Date(outRec.timestamp).getTime() 
        : new Date().getTime();
      
      if (workEnd > workStart) {
        let workMs = workEnd - workStart - breakMs;
        if (workMs < 0) workMs = 0;
        
        const totalMinutes = Math.floor(workMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours > 0) {
          workStr = `${hours} Jam ${minutes} Menit`;
        } else {
          workStr = `${minutes} Menit`;
        }
      }
    }
    
    return { workStr, breakStr };
  };

  // Reverse Geocoding via OpenStreetMap Nominatim
  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8' }
      });
      const data = await response.json();
      return data.display_name || `Lokasi: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.warn('Reverse geocoding failed, using fallback:', error);
      return `Jl. Ciledug Raya, Petukangan Utara, Kebayoran Lama, Jakarta Selatan`;
    }
  };

  // Start the GPS & Camera flow on demand (Mulai Absen click)
  const startAttendanceFlow = async () => {
    setIsActivating(true);
    setHasPermission(null);
    setPermissionError('');

    try {
      // 1. Get Coordinates
      if (!navigator.geolocation) {
        throw new Error('Perangkat Anda tidak mendukung GPS Geolocation.');
      }

      const gpsPos: any = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const coords = {
        lat: gpsPos.coords.latitude,
        lng: gpsPos.coords.longitude,
        isMock: gpsPos.mocked || false,
      };
      setLocation(coords);

      // 2. Fetch Reverse Geocode Address
      const resolvedAddress = await getAddressFromCoords(coords.lat, coords.lng);
      setAddress(resolvedAddress);

      // 3. Request Camera access and stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode }
      });

      setHasPermission(true);
      setIsCameraOpen(true);

      // Bind stream to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 200);

    } catch (err: any) {
      console.error('Camera/GPS Activation error:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.code === 1) {
        setPermissionError('Akses Kamera atau lokasi GPS diblokir browser. Harap izinkan akses pada setelan aplikasi browser Anda.');
      } else {
        setPermissionError(err.message || 'Gagal mengaktifkan Kamera or Geolocation GPS Anda.');
      }
    } finally {
      setIsActivating(false);
    }
  };

  // Switch camera mode (Front / Back toggle)
  const toggleCameraFacing = async () => {
    stopCameraStream();
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
      console.error('Failed to toggle camera facing mode:', err);
      toast({
        variant: 'destructive',
        title: 'Kamera Gagal Diganti',
        description: 'Perangkat Anda mungkin tidak mendukung mode kamera ini.'
      });
    }
  };

  const submitQuickBreak = async (type: 'BREAK' | 'END_BREAK') => {
    setIsLoading(true);
    const endpoint = type === 'BREAK' ? 'break' : 'end-break';
    const actionLabel = type === 'BREAK' ? 'Mulai Istirahat' : 'Selesai Istirahat';

    try {
      // Get Coordinates
      if (!navigator.geolocation) {
        throw new Error('Perangkat Anda tidak mendukung GPS Geolocation.');
      }

      const gpsPos: any = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const coords = {
        lat: gpsPos.coords.latitude,
        lng: gpsPos.coords.longitude,
        isMock: gpsPos.mocked || false,
      };
      setLocation(coords);

      const resolvedAddress = await getAddressFromCoords(coords.lat, coords.lng);
      setAddress(resolvedAddress);

      await axios.post(
        `${apiUrl}/attendance/${endpoint}`,
        {
          lat: coords.lat,
          lng: coords.lng,
          isMock: coords.isMock,
          photoUrl: null,
          clientTimestamp: Date.now(),
          address: resolvedAddress,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessModalData({
        isOpen: true,
        title: `${actionLabel} Berhasil 🎉`,
        desc: `Data anda sudah tercatat di system`
      });
      fetchTodayStatus(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: `${actionLabel} Gagal`,
        description: error.message || error.response?.data?.message || 'Gagal mengirim data status ke basis data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTodayStatus = async (isInitial = false) => {
    try {
      const res = await axios.get(
        `${apiUrl}/attendance/today`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const status = res.data.status || 'Belum Absen';
      setAttendanceStatus(status);
      setHasApprovedRequest(!!res.data.hasApprovedRequest);
      setTodayRecords(res.data.records || []);

      // Automatically launch full camera flow on mount if status requires photo capture or has approved request
      if (isInitial && (status === 'Belum Absen' || status === 'Selesai Istirahat' || !!res.data.hasApprovedRequest)) {
        startAttendanceFlow();
      }
    } catch (err) {
      console.error('Failed to fetch today status:', err);
    } finally {
      setFetchingStatus(false);
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
    fetchTodayStatus(true);
  }, [token, user, isHydrated]);

  // Draw photo canvas with professional timestamp + GPS watermark
  const drawWatermark = (canvas: HTMLCanvasElement, timestamp: string, coordsStr: string, addrStr: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Proportional dimensions
    const fontSize = Math.max(13, Math.floor(width / 35));
    const padding = Math.max(15, Math.floor(width / 40));
    const bannerHeight = fontSize * 5.2;

    // Translucent dark gradient banner at the bottom
    const gradient = ctx.createLinearGradient(0, height - bannerHeight, 0, height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    gradient.addColorStop(0.2, 'rgba(0, 0, 0, 0.85)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Left Accent Stripe in Orange
    ctx.fillStyle = '#f97316';
    ctx.fillRect(padding / 2, height - bannerHeight + (padding / 2), 6, bannerHeight - padding);

    // Text Shadow style
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // 1. Application Name Header
    ctx.font = `bold ${fontSize * 1.15}px 'Outfit', 'Inter', sans-serif`;
    ctx.fillText('SI PETUT ABSENSI PPSU', padding, height - bannerHeight + padding + fontSize);

    // 2. Timestamp & GPS Coordinates Info Row
    ctx.font = `bold ${fontSize * 0.8}px 'Inter', sans-serif`;
    ctx.fillStyle = '#e2e8f0'; // slate-200
    ctx.fillText(`Waktu: ${timestamp}   |   GPS: ${coordsStr}`, padding, height - bannerHeight + padding + (fontSize * 2.2));

    // 3. Location Address wrapping text block
    ctx.font = `500 ${fontSize * 0.72}px 'Inter', sans-serif`;
    ctx.fillStyle = '#cbd5e1'; // slate-300
    
    const maxTextWidth = width - (padding * 2);
    const words = addrStr.split(' ');
    let line = 'Alamat: ';
    let y = height - bannerHeight + padding + (fontSize * 3.4);

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && n > 0) {
        ctx.fillText(line, padding, y);
        line = words[n] + ' ';
        y += fontSize * 0.95;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, padding, y);

    // Reset shadows
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  // Capture Photo action
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && location) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Mirror the canvas context if front camera is active (natural look)
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Reset transform so text/watermark is NOT mirrored
        if (facingMode === 'user') {
          context.setTransform(1, 0, 0, 1, 0, 0);
        }

        // Generate Metadata values
        const timestamp = new Date().toLocaleString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' WIB';
        
        const coordsStr = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;

        // Draw Watermark
        drawWatermark(canvas, timestamp, coordsStr, address);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPhoto(dataUrl);

        // Stop camera stream & close view overlay
        stopCameraStream();
        setIsCameraOpen(false);
      }
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    startAttendanceFlow();
  };

  const submitAttendance = async () => {
    if (!photo || !location) return;
    setIsLoading(true);

    const isCheckOut = attendanceStatus === 'Selesai Istirahat';
    const endpoint = isCheckOut ? 'check-out' : 'check-in';

    try {
      await axios.post(
        `${apiUrl}/attendance/${endpoint}`,
        {
          lat: location.lat,
          lng: location.lng,
          isMock: location.isMock,
          photoUrl: photo,
          clientTimestamp: Date.now(),
          address: address,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessModalData({
        isOpen: true,
        title: isCheckOut ? 'Absen Pulang Berhasil 🎉' : 'Absen Masuk Berhasil 🎉',
        desc: `Data anda sudah tercatat di system`
      });
      setPhoto(null);
      fetchTodayStatus(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: isCheckOut ? 'Absen Pulang Gagal' : 'Absen Masuk Gagal',
        description: error.response?.data?.message || 'Gagal mengirim data absensi ke basis data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchingStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-zinc-500 text-sm font-semibold">Memeriksa absensi hari ini...</p>
      </div>
    );
  }

  const isCheckOut = attendanceStatus === 'Selesai Istirahat';

  const getHeaderInfo = () => {
    switch (attendanceStatus) {
      case 'Belum Absen':
        return {
          title: 'Absensi Masuk (Check-In)',
          subtitle: 'Silakan ambil foto selfie untuk masuk kerja hari ini'
        };
      case 'Sudah Absen':
        return {
          title: 'Absen Istirahat',
          subtitle: 'Mulai waktu istirahat Anda hari ini'
        };
      case 'Absen Istirahat':
        return {
          title: 'Selesai Istirahat',
          subtitle: 'Akhiri waktu istirahat dan kembali bertugas'
        };
      case 'Selesai Istirahat':
        return {
          title: 'Absensi Keluar (Check-Out)',
          subtitle: 'Silakan ambil foto selfie untuk mengakhiri tugas lapangan'
        };
      case 'Sudah Absen Pulang':
      case 'Sudah Check-Out':
      case 'Sudah Checkout':
        return {
          title: 'Absensi Selesai',
          subtitle: 'Tugas lapangan hari ini telah selesai sempurna'
        };
      default:
        return {
          title: 'Absensi Masuk (Check-In)',
          subtitle: 'Pastikan Anda telah berada di lokasi kerja'
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="p-6 space-y-6 pb-24 relative">
      <header className="space-y-1">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
          {headerInfo.title}
        </h2>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
          {headerInfo.subtitle}
        </p>
      </header>

      {todayRecords.length > 0 && (
        <Card className="border-none shadow-md bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-4.5 border border-zinc-100 dark:border-zinc-800 animate-in fade-in duration-300">
          <div className="grid grid-cols-2 gap-4">
            {(() => {
              const { workStr, breakStr } = calculateDurations(todayRecords);
              return (
                <>
                  <div className="space-y-1">
                    <span className="block text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Durasi Masuk (Kerja Net)</span>
                    <p className="text-sm font-black text-emerald-650 dark:text-emerald-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      {workStr}
                    </p>
                  </div>
                  <div className="space-y-1 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                    <span className="block text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Durasi Istirahat</span>
                    <p className="text-sm font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-550" />
                      {breakStr}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      )}

      {attendanceStatus === 'Menunggu Diterima' ? (
        <Card className="border-none shadow-xl bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-zinc-800 dark:text-white">Permintaan Absen Menunggu Diterima</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Permintaan absen masuk di luar jadwal kerja Anda telah terkirim dan saat ini berstatus <strong>Menunggu Diterima</strong> oleh Staff, Pimpinan, dan Admin.
            </p>
          </div>
          <Button 
            onClick={() => router.push('/ppsu/home')} 
            className="w-full bg-amber-550 hover:bg-amber-600 text-white font-bold rounded-2xl py-6 mt-4 shadow-lg shadow-amber-500/10 transition-all active:scale-95"
          >
            Kembali ke Beranda
          </Button>
        </Card>
      ) : ['Sudah Absen Pulang', 'Sudah Check-Out', 'Sudah Checkout'].includes(attendanceStatus) && !hasApprovedRequest ? (
        <Card className="border-none shadow-xl bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-zinc-800 dark:text-white">Tugas Anda Hari Ini Selesai</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Anda sudah melakukan absensi masuk, istirahat, selesai istirahat, dan absen pulang hari ini. Silakan beristirahat dengan baik!
            </p>
          </div>
          <Button 
            onClick={() => router.push('/ppsu/home')} 
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl py-6 mt-4 shadow-lg shadow-orange-500/10 transition-all active:scale-95"
          >
            Kembali ke Beranda
          </Button>
        </Card>
      ) : ['Sudah Absen', 'Absen Istirahat'].includes(attendanceStatus) ? (
        <Card className="border-none shadow-xl bg-white dark:bg-zinc-900 rounded-3xl p-6 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-orange-50 dark:bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-10 h-10 text-orange-600 animate-pulse" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/20 font-bold px-3 py-1 text-xs">
              {attendanceStatus === 'Sudah Absen' ? 'Waktu Istirahat' : 'Kembali Bertugas'}
            </Badge>
            <h3 className="text-base font-bold text-zinc-850 dark:text-white">
              {attendanceStatus === 'Sudah Absen' ? 'Mulai Waktu Istirahat' : 'Selesai Waktu Istirahat'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
              {attendanceStatus === 'Sudah Absen' 
                ? 'Klik tombol di bawah untuk mencatat jam mulai istirahat Anda hari ini. Proses ini tidak memerlukan pengambilan foto.'
                : 'Klik tombol di bawah untuk mencatat jam selesai istirahat dan kembali bekerja. Proses ini tidak memerlukan pengambilan foto.'}
            </p>
          </div>

          <Button 
            onClick={() => submitQuickBreak(attendanceStatus === 'Sudah Absen' ? 'BREAK' : 'END_BREAK')}
            disabled={isLoading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl py-6 shadow-md transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Mencatat Status...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                {attendanceStatus === 'Sudah Absen' ? 'Tekan Mulai Istirahat' : 'Tekan Selesai Istirahat'}
              </>
            )}
          </Button>
        </Card>
      ) : (
        <>
          {/* Main Landing: Start Attendance Trigger Card (When no photo taken) */}
          {!photo && (
            <Card className="border-none shadow-xl bg-white dark:bg-zinc-900 rounded-3xl p-6 text-center space-y-6">
              <div className="w-20 h-20 bg-orange-50 dark:bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-10 h-10 text-orange-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/20 font-bold px-3 py-1 text-xs">
                  {attendanceStatus === 'Selesai Istirahat' ? 'Shift Selesai' : 'Mulai Tugas'}
                </Badge>
                <h3 className="text-base font-bold text-zinc-850 dark:text-white">
                  Absensi Wajib GPS & Kamera HP
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                  Aplikasi akan memvalidasi posisi koordinat GPS Anda secara real-time dan mengambil foto bukti kehadiran yang disematkan dengan *watermark* terintegrasi.
                </p>
              </div>

              <Button 
                onClick={startAttendanceFlow}
                disabled={isActivating}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl py-6 shadow-md transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menghubungkan GPS & Kamera...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    {attendanceStatus === 'Selesai Istirahat' ? 'Mulai Absen Pulang' : 'Mulai Absen Masuk'}
                  </>
                )}
              </Button>
            </Card>
          )}

          {/* Captured Photo Preview Screen */}
          {photo && (
            <div className="space-y-6">
              <Card className="border-none shadow-xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Bukti Foto Berhasil Diambil</span>
                  </div>
                  <Badge className="bg-orange-500 border-none font-bold text-xs">Akurat</Badge>
                </div>
                <div className="relative aspect-[3/4] bg-zinc-900">
                  <img src={photo} alt="Watermarked Bukti Absen" className="w-full h-full object-contain" />
                </div>
              </Card>

              {/* Resolved Geolocation Address Info card */}
              <Card className="border-none shadow-md rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-4">
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-orange-100 dark:bg-orange-950/40 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Titik Koordinat Terdeteksi</p>
                    <p className="text-xs font-black text-zinc-850 dark:text-white truncate">
                      {location ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}` : '-'}
                    </p>
                    <p className="text-[11px] text-zinc-500 leading-tight">
                      {address}
                    </p>
                  </div>
                  <div 
                    onClick={() => setShowFullMap(true)} 
                    className="w-16 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 relative cursor-pointer active:scale-95 transition-all flex-shrink-0 self-center"
                  >
                    <MapComponent 
                      center={[location?.lat, location?.lng]} 
                      zoom={16} 
                      points={[{ lat: location?.lat, lng: location?.lng, name: 'Anda', status: 'Lokasi Absen' }]} 
                    />
                    <div className="absolute inset-0 bg-transparent" />
                  </div>
                </div>
              </Card>

              {/* Actions submit/retake */}
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={handleRetake} 
                  className="flex-1 py-6 rounded-2xl font-bold border-zinc-200 dark:border-zinc-800 text-zinc-650 hover:bg-zinc-100 transition-all duration-300"
                >
                  Ambil Ulang Foto
                </Button>
                <Button 
                  onClick={submitAttendance} 
                  disabled={isLoading || !location} 
                  className="flex-1 py-6 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black shadow-lg shadow-orange-600/10 transition-all duration-300 transform active:scale-95"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (attendanceStatus === 'Selesai Istirahat' ? 'Kirim Absen Pulang' : 'Kirim Absen Masuk')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. FULL SCREEN CAMERA OVERLAY */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
          {/* Camera Top Controls */}
          <div className="p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
            <Button 
              variant="ghost" 
              onClick={() => {
                stopCameraStream();
                setIsCameraOpen(false);
              }} 
              className="text-white hover:bg-white/10 rounded-full w-10 h-10 p-0 flex items-center justify-center"
            >
              <img src="/gambar/close.png" alt="Close" className="w-6 h-6 object-contain" />
            </Button>

            <Badge className="bg-orange-600 text-white font-bold border-none py-1.5 px-3 rounded-full flex items-center gap-1.5 animate-pulse">
              <Clock className="w-3.5 h-3.5" /> GPS AKTIF
            </Badge>

            <Button 
              variant="ghost" 
              onClick={toggleCameraFacing} 
              className="text-white hover:bg-white/10 border border-white/20 px-3.5 py-1.5 h-auto rounded-xl flex items-center gap-1.5 text-[11px] font-black bg-black/30 backdrop-blur-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Ganti Camera
            </Button>
          </div>

          {/* Camera Video View Finder */}
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
            />
            
            {/* Virtual Target Guidelines to make it premium */}
            <div className="absolute inset-x-12 inset-y-28 border border-dashed border-white/25 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="w-6 h-6 border-t-2 border-l-2 border-orange-500 absolute top-0 left-0 rounded-tl-lg" />
              <div className="w-6 h-6 border-t-2 border-r-2 border-orange-500 absolute top-0 right-0 rounded-tr-lg" />
              <div className="w-6 h-6 border-b-2 border-l-2 border-orange-500 absolute bottom-0 left-0 rounded-bl-lg" />
              <div className="w-6 h-6 border-b-2 border-r-2 border-orange-500 absolute bottom-0 right-0 rounded-br-lg" />
              
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Tempatkan Wajah Anda Di Sini</p>
            </div>
          </div>

          {/* Hidden canvas for drawing watermarked screenshots */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera Bottom Controls */}
          <div className="p-8 z-50 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-4">
            {/* Live Info overlay */}
            <div className="bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center max-w-xs space-y-0.5">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                <MapPin className="w-3 h-3" /> Akurasi GPS Tinggi
              </div>
              <p className="text-[10px] text-white/80 leading-normal truncate w-60">
                {address || 'Menghubungkan posisi GPS...'}
              </p>
            </div>

            {/* Big circular capture button */}
            <div className="flex items-center justify-center py-2">
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 bg-orange-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center transition-all transform active:scale-90 hover:scale-105 active:bg-orange-700 overflow-hidden"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 animate-ping absolute pointer-events-none" />
                <img src="/gambar/camera.png" alt="Shutter" className="w-10 h-10 object-contain" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FullMap Modal */}
      {showFullMap && location && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden w-full max-w-md shadow-2xl flex flex-col h-[60vh] animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600 animate-bounce" />
                <h3 className="font-black text-zinc-900 dark:text-white">Peta Lokasi GPS Anda</h3>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFullMap(false)}
                className="h-10 px-4 rounded-xl font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-850 dark:hover:bg-zinc-750 border-none transition-all active:scale-95 text-zinc-700 dark:text-white"
              >
                Tutup
              </Button>
            </div>
            
            <div className="flex-1 relative">
              <MapComponent 
                center={[location.lat, location.lng]} 
                zoom={16} 
                points={[{ lat: location.lat, lng: location.lng, name: 'Lokasi Anda', status: 'Akurasi GPS Sangat Baik' }]} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Global Non-closable Permissions Overlay Modal */}
      {hasPermission === false && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">Izin Kamera & GPS Wajib</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                Aplikasi **SIPETUT** mewajibkan akses Kamera dan lokasi GPS aktif untuk menjamin validitas kehadiran Anda.
              </p>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 text-red-600 text-xs p-3.5 rounded-2xl text-left leading-relaxed">
                {permissionError || 'Harap berikan izin akses Kamera & GPS di browser Anda.'}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setHasPermission(null)}
                className="flex-1 py-6 rounded-2xl font-bold"
              >
                Kembali
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-red-650 hover:bg-red-700 text-white font-bold py-6 rounded-2xl shadow-lg transition-all active:scale-95"
              >
                Muat Ulang
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Success Modal */}
      {successModalData.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform scale-100 transition-all duration-300 animate-in zoom-in-95">
            <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">
              {successModalData.title}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
              {successModalData.desc}
            </p>
            <button
              onClick={() => {
                setSuccessModalData({ isOpen: false, title: '', desc: '' });
                router.push('/ppsu/home');
              }}
              className="w-full py-3.5 rounded-xl font-bold text-white transition-all duration-300 shadow-md bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-500/20"
            >
              Melanjutkan ke Beranda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
