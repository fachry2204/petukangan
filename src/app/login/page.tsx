'use client';
import Image from 'next/image';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { MapPin, ShieldCheck, Loader2, Volume2, Volume1, VolumeX } from 'lucide-react';
import YoutubeBackground from '@/components/YoutubeBackground';

// Helper for Youtube URL
const getYoutubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'success' | 'error';
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'success'
  });

  const { setAuth } = useAuthStore();
  const settings = useSettingsStore();
  const router = useRouter();
  const { toast } = useToast();

  const [loginVolume, setLoginVolume] = useState(0);

  // Dynamic mobile viewport detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with global settings volume on load
  useEffect(() => {
    if (settings.bgVideoVolume !== undefined) {
      setLoginVolume(settings.bgVideoVolume);
    }
  }, [settings.bgVideoVolume]);

  // Reset video error state when the YouTube link is updated
  useEffect(() => {
    setHasVideoError(false);
  }, [settings.bgVideo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        username,
        password,
      });

      setAuth(response.data.user, response.data.access_token);
      
      setModalState({
        isOpen: true,
        title: 'Login Berhasil 🎉',
        description: `Selamat datang kembali, ${response.data.user.fullName}. Mengalihkan Anda ke sistem...`,
        type: 'success'
      });

      setTimeout(() => {
        const roleName = response.data.user.role?.name || response.data.user.role;
        if (roleName === 'PPSU') {
          router.push('/ppsu/home');
        } else {
          router.push('/admin/dashboard');
        }
      }, 1500);
    } catch (error: any) {
      setModalState({
        isOpen: true,
        title: 'Login Gagal ❌',
        description: error.response?.data?.message || 'Terjadi kesalahan sistem, silakan periksa kembali username & password Anda.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center md:p-4 relative overflow-hidden bg-zinc-950"
      style={!isMobile && (settings.bgType === 'image' || hasVideoError || (settings.bgType === 'video' && (!settings.bgVideo || !getYoutubeId(settings.bgVideo)))) ? {
        backgroundImage: `url(${settings.bgImage || '/bg.jpg'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}}
    >
      {!isMobile && settings.bgType === 'video' && settings.bgVideo && getYoutubeId(settings.bgVideo) && !hasVideoError && (
        <>
          <YoutubeBackground 
            videoId={getYoutubeId(settings.bgVideo) || ''} 
            volume={loginVolume} 
            onError={() => setHasVideoError(true)}
          />
          
          {/* Glassmorphic volume slider bottom-left corner */}
          <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 p-3 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 group">
            <button 
              onClick={() => {
                const nextVol = loginVolume > 0 ? 0 : 50;
                setLoginVolume(nextVol);
                settings.setSettings({ bgVideoVolume: nextVol });
              }}
              className="text-white hover:text-orange-400 transition-colors p-1"
            >
              {loginVolume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : loginVolume < 50 ? (
                <Volume1 className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <div className="w-0 overflow-hidden transition-all duration-300 group-hover:w-28 flex items-center">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={loginVolume}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setLoginVolume(val);
                  settings.setSettings({ bgVideoVolume: val });
                }}
                className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
            <span className="text-white text-[10px] font-bold opacity-80 group-hover:block hidden min-w-[24px]">
              {loginVolume}%
            </span>
          </div>
        </>
      )}

      {/* Dark Overlay for better contrast on desktop */}
      {!isMobile && <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-0" />}

      <Card className="w-full h-full min-h-screen md:min-h-0 md:h-auto md:max-w-md border-none shadow-none md:shadow-2xl bg-white dark:bg-zinc-900 rounded-none md:rounded-3xl overflow-y-auto md:overflow-hidden relative z-10 flex flex-col justify-center py-10 md:py-0">

        {/* Ornament Top */}
        <div className="absolute top-0 left-0 w-full z-0">
          <Image
            src="/gambar/ornamen.png"
            alt="Ornamen"
            width={500}
            height={50}
            className="w-full h-auto object-cover object-top"
            priority
          />
        </div>
        <CardHeader className="text-center pt-14 relative z-10">
          <div className="mx-auto mb-4 flex justify-center">
            <img
              src={settings.logoUrl || "/logodki.png"}
              alt="Logo System"
              className="object-contain w-20 h-20"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-white">{settings.systemName}</CardTitle>
          <CardDescription className="text-zinc-500">{settings.systemDescription}</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Masukkan username"
                className="h-14 text-lg rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-orange-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-14 text-lg rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-orange-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-orange-500/20"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              Masuk ke Sistem
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <p className="text-xs text-zinc-400 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" />
              Kelurahan Petukangan Utara © 2026
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Center Interactive Success/Error Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform scale-100 transition-all duration-300 animate-in zoom-in-95">
            <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-800">
              {modalState.type === 'success' ? (
                <span className="text-4xl">🎉</span>
              ) : (
                <span className="text-4xl">❌</span>
              )}
            </div>
            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white mb-2">
              {modalState.title}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
              {modalState.description}
            </p>
            <button
              onClick={() => {
                setModalState(prev => ({ ...prev, isOpen: false }));
              }}
              className={`w-full py-3.5 rounded-xl font-bold text-white transition-all duration-300 shadow-md ${
                modalState.type === 'success' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/20' 
                  : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/20'
              }`}
            >
              {modalState.type === 'success' ? 'Melanjutkan...' : 'Coba Lagi'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
