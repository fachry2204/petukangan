'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Phone, 
  Lock, 
  LogOut, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Calendar, 
  KeyRound, 
  Briefcase 
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

export default function PpsuProfilePage() {
  const { user, token, setAuth, logout } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // Form states
  const [newPhone, setNewPhone] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const refreshUserSession = async () => {
    try {
      const res = await axios.get(`${apiUrl}/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuth(res.data, token!);
    } catch (err) {
      console.error('Failed to sync user session:', err);
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
    setNewPhone(user.phone || '');
    refreshUserSession();
  }, [token, user, isHydrated]);

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast({ title: 'Logged Out', description: 'Anda telah berhasil keluar sistem.' });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPhotoLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        await axios.put(
          `${apiUrl}/users/${user.id}`,
          { photoUrl: base64Data },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({ title: 'Foto Profil Diperbarui', description: 'Foto profil Anda berhasil diunggah.' });
        await refreshUserSession();
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Gagal Mengunggah Foto',
          description: err.response?.data?.message || 'Terjadi kesalahan saat mengunggah foto.'
        });
      } finally {
        setIsPhotoLoading(false);
      }
    };
  };

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone) return;

    setIsLoading(true);
    try {
      await axios.put(
        `${apiUrl}/users/${user.id}`,
        { phone: newPhone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Nomor Telepon Diperbarui', description: 'Nomor telepon Anda berhasil diperbarui.' });
      setShowPhoneModal(false);
      await refreshUserSession();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Pembaruan Gagal',
        description: err.response?.data?.message || 'Gagal memperbarui nomor telepon.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ variant: 'destructive', title: 'Password Tidak Cocok', description: 'Konfirmasi password baru Anda tidak cocok.' });
      return;
    }

    if (passwordForm.newPassword.length < 4) {
      toast({ variant: 'destructive', title: 'Password Terlalu Pendek', description: 'Password minimal terdiri dari 4 karakter.' });
      return;
    }

    setIsLoading(true);
    try {
      await axios.put(
        `${apiUrl}/users/${user.id}`,
        { password: passwordForm.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: 'Password Diperbarui', description: 'Password Anda berhasil diganti.' });
      setShowPasswordModal(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Penggantian Password Gagal',
        description: err.response?.data?.message || 'Gagal mengganti password Anda.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header */}
      <header>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Profil Petugas</h2>
        <p className="text-sm text-zinc-500 font-medium">Informasi akun dan pengaturan keamanan</p>
      </header>

      {/* Main Card Profil */}
      <Card 
        className="border-none shadow-xl rounded-3xl overflow-hidden relative"
        style={{ 
          backgroundImage: "url('/gambar/bgheaderppsu.jpg')", 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        }}
      >
        {/* Transparent Premium Overlay for contrast */}
        <div className="absolute inset-0 bg-white/85 dark:bg-zinc-950/90 backdrop-blur-[1px] pointer-events-none" />

        <CardContent className="p-6 flex flex-col items-center text-center space-y-4 relative z-10">
          
          {/* Avatar Section */}
          <div className="relative group">
            <div className="w-28 h-28 rounded-full border-4 border-orange-500/20 overflow-hidden bg-zinc-100 flex items-center justify-center shadow-md relative">
              {isPhotoLoading ? (
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              ) : user.photoUrl ? (
                <img 
                  src={user.photoUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = user.photoUrl; // Fallback direct base64
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-3xl">
                  {user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'PS'}
                </div>
              )}
            </div>
            
            {/* Camera Overlay Button */}
            <label className="absolute bottom-0 right-0 bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-full shadow-lg border border-white cursor-pointer transition-all hover:scale-110 active:scale-95">
              <img src="/gambar/camera.png" alt="Kamera" className="w-4 h-4 object-contain brightness-0 invert" />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                className="hidden" 
              />
            </label>
          </div>

          {/* User Basic Info */}
          <div className="space-y-1">
            <h3 className="text-xl font-black text-zinc-900 dark:text-white">{user.fullName}</h3>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{user.username}</p>
            <div className="pt-2">
              <Badge className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 hover:bg-orange-50 border-none font-bold capitalize">
                {user.role?.name || 'Petugas PPSU'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info Details List */}
      <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden">
        <CardContent className="p-0 divide-y divide-zinc-50 dark:divide-zinc-800">
          
          {/* Detail Item: Address */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/gambar/maphome.png" alt="Alamat" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Alamat Lengkap</p>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {[
                    user.address,
                    user.village ? `Kel. ${user.village}` : null,
                    user.district ? `Kec. ${user.district}` : null,
                    user.city,
                    user.province,
                    user.postalCode
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Detail Item: Phone */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/gambar/wa.png" alt="WhatsApp" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Nomor Telepon</p>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {user.phone ? `+${user.phone}` : 'Belum Ditambahkan'}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => {
                setNewPhone(user.phone || '');
                setShowPhoneModal(true);
              }}
              className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-bold px-3 py-1 rounded-lg"
            >
              Ubah
            </Button>
          </div>

          {/* Detail Item: Status */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/gambar/office.png" alt="Status" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Status Keaktifan</p>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 capitalize">
                  {user.status?.toLowerCase() || 'Aktif'}
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-600 hover:bg-green-100 border-none font-bold">
              Active
            </Badge>
          </div>
          
        </CardContent>
      </Card>

      {/* Security & System Actions */}
      <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden">
        <CardContent className="p-0 divide-y divide-zinc-50 dark:divide-zinc-800">
          
          {/* Action Item: Change Password */}
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-50 dark:bg-orange-950/20 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/gambar/key.png" alt="Kunci" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Ganti Password Keamanan</p>
                <p className="text-[10px] text-zinc-400">Jaga keamanan akun Anda secara berkala</p>
              </div>
            </div>
            <Lock className="w-4 h-4 text-zinc-300" />
          </button>

          {/* Action Item: Logout */}
          <button 
            onClick={handleLogout}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-50 dark:bg-red-950/20 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/gambar/logout.png" alt="Logout" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-600">Keluar dari Akun</p>
                <p className="text-[10px] text-zinc-400">Logout dari sesi perangkat ini</p>
              </div>
            </div>
          </button>
          
        </CardContent>
      </Card>

      {/* Modals Container */}
      <>
        
        {/* Modal: Change Password */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-155">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-orange-600" />
                Ganti Password Baru
              </h3>
              <p className="text-xs text-zinc-400 mb-6">Pastikan password baru Anda sulit ditebak orang lain.</p>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-500">Password Baru</Label>
                  <Input 
                    type="password"
                    placeholder="Minimal 4 karakter"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-500">Konfirmasi Password Baru</Label>
                  <Input 
                    type="password"
                    placeholder="Ketik ulang password baru"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordForm({ newPassword: '', confirmPassword: '' });
                    }}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex-1 h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Phone */}
        {showPhoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-155">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <Phone className="w-5 h-5 text-orange-600" />
                Ubah Nomor Telepon
              </h3>
              <p className="text-xs text-zinc-400 mb-6">Gunakan nomor telepon / WhatsApp yang aktif.</p>
              
              <form onSubmit={handleUpdatePhone} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-500">Nomor Baru</Label>
                  <Input 
                    type="text"
                    placeholder="Contoh: 08123456789"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowPhoneModal(false)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex-1 h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

      </>

    </div>
  );
}
