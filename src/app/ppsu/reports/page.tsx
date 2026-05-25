'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Camera, MapPin, Loader2, Send, X, Clock, SwitchCamera, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';

export default function PpsuReportPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { toast } = useToast();

  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'KEJADIAN',
    description: '',
    urgency: 'NORMAL',
  });

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

  // Location state
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('Mengambil lokasi GPS...');
  const [now, setNow] = useState<Date>(new Date());

  // Live clock for watermark/display
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch GPS + reverse geocode on mount
  useEffect(() => {
    fetchLocation();
    return () => stopCameraStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const getGpsPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      const onErr = (err: GeolocationPositionError) => {
        if (err.code === err.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            resolve,
            (e2) => reject(new Error(e2.message || 'Gagal mengambil lokasi GPS')),
            { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 },
          );
          return;
        }
        reject(new Error(err.message || 'Gagal mengambil lokasi GPS'));
      };
      navigator.geolocation.getCurrentPosition(resolve, onErr, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 30000,
      });
    });

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'id' } },
      );
      const data = await res.json();
      return data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const fetchLocation = async () => {
    try {
      if (!navigator.geolocation) {
        setAddress('GPS tidak didukung perangkat ini.');
        return;
      }
      const pos = await getGpsPosition();
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLocation(coords);
      const a = await reverseGeocode(coords.lat, coords.lng);
      setAddress(a);
    } catch (e: any) {
      setAddress(e?.message || 'Gagal mengambil lokasi.');
    }
  };

  // ---------- Camera ----------
  const stopCameraStream = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const enumerateVideoInputs = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videos);
      return videos;
    } catch {
      return [] as MediaDeviceInfo[];
    }
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

  const startCamera = async (
    opts: { deviceId?: string; mode?: 'user' | 'environment' } = {},
  ) => {
    try {
      stopCameraStream();
      await sleep(150);
      setIsCapturing(true);
      const constraints: MediaStreamConstraints = opts.deviceId
        ? { video: { deviceId: { exact: opts.deviceId } } }
        : { video: { facingMode: opts.mode || facingMode } };
      const stream = await tryGetUserMedia(constraints);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 80);
      const videos = await enumerateVideoInputs();
      if (opts.deviceId) {
        const idx = videos.findIndex((d) => d.deviceId === opts.deviceId);
        if (idx >= 0) setCurrentDeviceIndex(idx);
      }
    } catch (err: any) {
      const name = err?.name || 'Error';
      let desc = 'Tidak dapat mengakses kamera.';
      if (name === 'NotAllowedError') desc = 'Izin kamera ditolak. Aktifkan izin pada browser.';
      else if (name === 'NotFoundError') desc = 'Kamera tidak ditemukan.';
      else if (name === 'NotReadableError') desc = 'Kamera dipakai aplikasi lain.';
      toast({ variant: 'destructive', title: `Kamera Gagal (${name})`, description: desc });
      setIsCapturing(false);
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
      const next = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(next);
      await startCamera({ mode: next });
      return;
    }
    const nextIndex = (currentDeviceIndex + 1) % devices.length;
    setCurrentDeviceIndex(nextIndex);
    await startCamera({ deviceId: devices[nextIndex].deviceId });
  };

  // Draw timestamp + location watermark on canvas
  const drawWatermark = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ts = new Date();
    const dateStr = ts.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
    });
    const timeStr = ts.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
    }) + ' WIB';
    const coordStr = location
      ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
      : 'GPS belum tersedia';
    const addr = address && address.length > 90 ? address.slice(0, 90) + '...' : address;

    const pad = Math.round(w * 0.025);
    const barH = Math.round(h * 0.16);

    // Translucent bottom bar
    const grad = ctx.createLinearGradient(0, h - barH, 0, h);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - barH, w, barH);

    // Vertical orange accent bar
    ctx.fillStyle = '#f97316';
    ctx.fillRect(pad, h - barH + pad, 6, barH - pad * 2);

    const baseFont = Math.max(14, Math.round(w * 0.022));
    const smallFont = Math.max(11, Math.round(w * 0.018));
    const textX = pad + 18;

    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.font = `bold ${baseFont}px Arial, sans-serif`;
    ctx.fillText(`${dateStr} • ${timeStr}`, textX, h - barH + pad + 2);

    ctx.font = `${smallFont}px Arial, sans-serif`;
    ctx.fillStyle = '#fed7aa';
    ctx.fillText(`📍 ${coordStr}`, textX, h - barH + pad + baseFont + 8);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    // Wrap address into max 2 lines
    const maxWidth = w - textX - pad;
    const words = (addr || '').split(' ');
    let line = '';
    let lineCount = 0;
    let y = h - barH + pad + baseFont + smallFont + 16;
    for (let i = 0; i < words.length && lineCount < 2; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth) {
        ctx.fillText(line, textX, y);
        line = words[i];
        y += smallFont + 4;
        lineCount++;
      } else {
        line = test;
      }
    }
    if (line && lineCount < 2) ctx.fillText(line, textX, y);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    c.width = v.videoWidth;
    c.height = v.videoHeight;

    // If mirrored preview (front camera), flip back so saved photo is natural
    if (facingMode === 'user') {
      ctx.save();
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, 0, 0, c.width, c.height);
      ctx.restore();
    } else {
      ctx.drawImage(v, 0, 0, c.width, c.height);
    }

    drawWatermark(ctx, c.width, c.height);

    setPhotos((prev) => [...prev, c.toDataURL('image/jpeg', 0.9)]);
    closeCamera();
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      toast({ variant: 'destructive', title: 'Foto Wajib', description: 'Silakan ambil minimal 1 foto kejadian' });
      return;
    }

    setIsLoading(true);
    try {
      let lat = location?.lat;
      let lng = location?.lng;
      if (lat == null || lng == null) {
        try {
          const pos = await getGpsPosition();
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // submit without GPS as fallback
        }
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/reports`,
        {
          ...form,
          photos,
          lat: lat ?? null,
          lng: lng ?? null,
          address: address || 'Lokasi Kejadian',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast({ title: 'Laporan Terkirim', description: 'Terima kasih atas laporan Anda' });
      router.push('/ppsu/home');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: error.response?.data?.message || 'Gagal mengirim laporan',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dateLabel = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
  const timeLabel = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
  }) + ' WIB';

  return (
    <div className="p-6 space-y-6 pb-24">
      <header>
        <h2 className="text-2xl font-bold">Lapor Kejadian</h2>
        <p className="text-sm text-zinc-500">Laporkan temuan masalah di lapangan</p>
      </header>

      {/* Live timestamp + location card */}
      <Card className="border-none shadow-sm rounded-2xl bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-zinc-900 overflow-hidden">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Timestamp Otomatis</p>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{dateLabel}</p>
            <p className="text-sm font-black text-orange-600 dark:text-orange-500 tabular-nums">{timeLabel}</p>
          </div>
        </CardContent>
        <div className="px-4 pb-3 -mt-1 flex items-start gap-2 text-[11px]">
          <MapPin className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-zinc-700 dark:text-zinc-300 leading-tight truncate">{address}</p>
            {location && (
              <p className="text-[10px] text-zinc-400 tabular-nums">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={fetchLocation}
            className="text-[10px] font-bold text-orange-600 hover:underline whitespace-nowrap"
          >
            Refresh GPS
          </button>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Judul Laporan</Label>
            <Input
              placeholder="Contoh: Pohon Tumbang, Jalan Berlubang"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-xl py-6"
            />
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <select
              className="w-full p-4 rounded-xl border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="KEJADIAN">Kejadian (Pohon Tumbang/Banjir)</option>
              <option value="INFRASTRUKTUR">Infrastruktur (Jalan/Lampu)</option>
              <option value="KEBERSIHAN">Kebersihan (Sampah Menumpuk)</option>
              <option value="SOSIAL">Masalah Sosial</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Deskripsi Lengkap</Label>
            <Textarea
              placeholder="Jelaskan detail kejadian..."
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Photo Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Foto Dokumentasi ({photos.length})</Label>
            <Button
              type="button"
              variant="ghost"
              onClick={() => startCamera()}
              className="text-orange-600 font-bold"
            >
              <Camera className="w-4 h-4 mr-2" /> Tambah Foto
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-zinc-100 dark:border-zinc-800">
                <img src={p} alt="Report" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 p-1 rounded-full text-white transition-colors"
                  aria-label="Hapus foto"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {photos.length === 0 && !isCapturing && (
              <button
                type="button"
                onClick={() => startCamera()}
                className="col-span-3 aspect-video rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Camera className="w-8 h-8 opacity-50" />
                <p className="text-xs font-bold">Ketuk untuk membuka kamera</p>
                <p className="text-[10px]">Foto akan otomatis menyimpan tanggal, waktu, & lokasi</p>
              </button>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full py-7 bg-zinc-900 text-white rounded-2xl font-bold text-lg shadow-xl active:scale-[0.98] transition-all"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Send className="w-6 h-6 mr-2" />}
          Kirim Laporan
        </Button>
      </form>

      {/* Fullscreen Camera Overlay (attendance-style) */}
      {isCapturing && (
        <div className="fixed inset-0 z-[10001] bg-black flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
          {/* Top Controls */}
          <div className="p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent relative">
            <Button
              type="button"
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
              type="button"
              variant="ghost"
              onClick={switchCamera}
              className="text-white hover:bg-white/10 border border-white/20 px-3.5 py-1.5 h-auto rounded-xl flex items-center gap-1.5 text-[11px] font-black bg-black/30 backdrop-blur-sm"
            >
              <SwitchCamera className="w-3.5 h-3.5" /> Ganti Kamera
            </Button>
          </div>

          {/* Viewfinder */}
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            <div className="absolute inset-x-12 inset-y-28 border border-dashed border-white/25 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="w-6 h-6 border-t-2 border-l-2 border-orange-500 absolute top-0 left-0 rounded-tl-lg" />
              <div className="w-6 h-6 border-t-2 border-r-2 border-orange-500 absolute top-0 right-0 rounded-tr-lg" />
              <div className="w-6 h-6 border-b-2 border-l-2 border-orange-500 absolute bottom-0 left-0 rounded-bl-lg" />
              <div className="w-6 h-6 border-b-2 border-r-2 border-orange-500 absolute bottom-0 right-0 rounded-br-lg" />
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center px-2">
                Arahkan Kamera ke Objek Kejadian
              </p>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="p-8 z-50 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-4 relative">
            <div className="bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center max-w-xs space-y-0.5">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                <MapPin className="w-3 h-3" /> {location ? 'Akurasi GPS Tinggi' : 'Mencari GPS...'}
              </div>
              <p className="text-[10px] text-white/80 leading-normal truncate w-60">
                {address || 'Menghubungkan posisi GPS...'}
              </p>
              <p className="text-[10px] text-white/60 tabular-nums">{timeLabel}</p>
            </div>

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
    </div>
  );
}
