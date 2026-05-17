'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, MapPin, Loader2, Send, X } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';

export default function PpsuReportPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'KEJADIAN',
    description: '',
    urgency: 'NORMAL'
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const { token } = useAuthStore();
  const { toast } = useToast();

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
        setPhotos([...photos, canvasRef.current.toDataURL('image/jpeg')]);
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setIsCapturing(false);
      }
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      toast({ variant: 'destructive', title: 'Foto Wajib', description: 'Silakan ambil minimal 1 foto kejadian' });
      return;
    }

    setIsLoading(true);
    try {
      const pos: any = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/reports`,
        {
          ...form,
          photos,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: 'Lokasi Kejadian'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast({ title: 'Laporan Terkirim', description: 'Terima kasih atas laporan Anda' });
      router.push('/ppsu/home');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: error.response?.data?.message || 'Gagal mengirim laporan' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <header>
        <h2 className="text-2xl font-bold">Lapor Kejadian</h2>
        <p className="text-sm text-zinc-500">Laporkan temuan masalah di lapangan</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Judul Laporan</Label>
            <Input 
              placeholder="Contoh: Pohon Tumbang, Jalan Berlubang" 
              required
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              className="rounded-xl py-6"
            />
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <select 
              className="w-full p-4 rounded-xl border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700"
              value={form.type}
              onChange={e => setForm({...form, type: e.target.value})}
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
              onChange={e => setForm({...form, description: e.target.value})}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Photo Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Foto Dokumentasi ({photos.length})</Label>
            <Button type="button" variant="ghost" onClick={startCamera} className="text-orange-600 font-bold">
              <img src="/gambar/icon/camera.png" alt="Kamera" className="w-4 h-4 object-contain mr-2" /> Tambah Foto
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                <img src={p} alt="Report" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {isCapturing && (
              <div className="col-span-3 relative aspect-video rounded-2xl overflow-hidden mt-2">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <Button 
                  type="button"
                  onClick={capturePhoto} 
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-orange-600 text-white rounded-full px-8 py-4 font-bold shadow-xl"
                >
                  Ambil Foto
                </Button>
              </div>
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
    </div>
  );
}
