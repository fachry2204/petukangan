'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Plus, Edit2, Trash2, Upload, Database, FileArchive, Download, Loader2, Save, KeyRound, MapPin, Settings2, Building2, Palette, Users, CheckCircle2, Info, Clock3, HardDrive, MonitorSmartphone } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiUrl } from '@/lib/api-config';

const ROLE_PAGES = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/monitoring', label: 'Live Monitoring' },
  { href: '/admin/online-officers', label: 'Data Petugas Online' },
  { href: '/admin/gps-history', label: 'Riwayat GPS' },
  { href: '/admin/sos', label: 'SOS Petugas' },
  { href: '/admin/users', label: 'Petugas' },
  { href: '/admin/attendance', label: 'Absensi Petugas' },
  { href: '/admin/schedules', label: 'Jadwal Petugas' },
  { href: '/admin/tasks', label: 'Tugas Lapangan' },
  { href: '/admin/reports', label: 'Laporan Kejadian' },
  { href: '/admin/settings', label: 'Pengaturan Sistem' },
];

export default function AdminSettingsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const { token } = useAuthStore();
  const settings = useSettingsStore();
  
  // Local state for backup
  const [backupType, setBackupType] = useState<'db' | 'file'>('db');
  const [dbBackup, setDbBackup] = useState({ isBackingUp: false, progress: 0, complete: false, fileName: '' });
  const [fileBackup, setFileBackup] = useState({ isBackingUp: false, progress: 0, complete: false, fileName: '' });

  const handleBackup = async () => {
    const type = backupType;
    const setState = type === 'db' ? setDbBackup : setFileBackup;
    
    setState(prev => ({ ...prev, isBackingUp: true, progress: 0, complete: false }));
    
    // Progress simulation up to 90%
    let progressVal = 0;
    const interval = setInterval(() => {
      progressVal += 5;
      if (progressVal >= 90) {
        clearInterval(interval);
        progressVal = 90;
      }
      setState(prev => ({ ...prev, progress: progressVal }));
    }, 300);

    try {
      const res = await axios.post('/api/backup', { type });
      
      clearInterval(interval);
      setState(prev => ({
        ...prev,
        isBackingUp: false,
        progress: 100,
        complete: true,
        fileName: res.data.fileName
      }));
    } catch (err: any) {
      clearInterval(interval);
      setState(prev => ({ ...prev, isBackingUp: false, progress: 0, complete: false }));
      alert('Proses backup gagal: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDownload = () => {
    const type = backupType;
    const active = type === 'db' ? dbBackup : fileBackup;
    if (!active.fileName) return;

    // Direct path to /public/backup inside Next.js public directory
    const fileUrl = `/backup/${active.fileName}`;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = active.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [isMigratingAdmins, setIsMigratingAdmins] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null);
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [resettingAdminId, setResettingAdminId] = useState<number | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    roleName: 'ADMIN',
  });

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${apiUrl}/users?type=admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'bg') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'system');
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.data.success) {
        if (type === 'logo') {
          settings.setSettings({ logoUrl: res.data.url });
        } else {
          settings.setSettings({ bgImage: res.data.url });
        }
      }
    } catch (err: any) {
      alert('Gagal mengupload file: ' + err.message);
    }
  };

  const handleSaveSettings = async () => {
    const officerIdPrefix = settings.officerIdPrefix.trim().toUpperCase();
    if (!/^[A-Z]{2,10}$/.test(officerIdPrefix)) {
      alert('Prefix ID Petugas harus 2–10 huruf tanpa angka atau spasi.');
      return;
    }
    setIsSaving(true);
    try {
      await axios.post(`${apiUrl}/settings`, {
        logoUrl: settings.logoUrl,
        bgType: settings.bgType,
        bgImage: settings.bgImage,
        bgVideo: settings.bgVideo,
        bgVideoVolume: settings.bgVideoVolume,
        systemName: settings.systemName,
        systemDescription: settings.systemDescription,
        villageName: settings.villageName,
        officerIdPrefix,
        attendanceMode: settings.attendanceMode,
        mainColor: settings.mainColor,
        maintenanceActive: settings.maintenanceActive,
        maintenanceEnd: settings.maintenanceEnd,
        maintenanceTitle: settings.maintenanceTitle,
        maintenanceDesc: settings.maintenanceDesc,
        gpsUpdateInterval: settings.gpsUpdateInterval,
        mapVisibility: settings.mapVisibility,
        roleAccess: settings.roleAccess,
        rolePermissions: settings.rolePermissions,
        footerText: settings.footerText,
        footerShowOnAdmin: settings.footerShowOnAdmin,
        footerShowOnLogin: settings.footerShowOnLogin,
        shifts: settings.shifts,
        zones: settings.zones,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Pengaturan berhasil disimpan ke database!');
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  // Filter users that are Admin, Staff, or Pimpinan
  const adminUsers = users.filter((u) => {
    const roleName = u.roleName || u.role?.name || u.role;
    return roleName && ['ADMIN', 'STAFF', 'PIMPINAN'].includes(String(roleName));
  });

  const setRoleAccess = (roleName: string, href: string, enabled: boolean) => {
    const current = settings.roleAccess || {};
    const currentRole = current[roleName] || {};
    const nextRole = { ...currentRole, [href]: enabled };
    settings.setSettings({ roleAccess: { ...current, [roleName]: nextRole } });
  };

  const handleCreateAdmin = async () => {
    if (!token) return;
    if (!newAdmin.username.trim() || !newAdmin.fullName.trim() || !newAdmin.email.trim() || !newAdmin.phone.trim() || !newAdmin.password) {
      alert('Username, password, Nama, Email, dan No HP wajib diisi.');
      return;
    }
    if (newAdmin.password.length < 8) {
      alert('Password minimal 8 karakter.');
      return;
    }
    if (!['ADMIN', 'STAFF', 'PIMPINAN'].includes(newAdmin.roleName)) {
      alert('Role tidak valid.');
      return;
    }
    setIsCreatingAdmin(true);
    try {
      await axios.post(
        `${apiUrl}/users`,
        {
          username: newAdmin.username.trim(),
          password: newAdmin.password,
          fullName: newAdmin.fullName.trim(),
          email: newAdmin.email.trim(),
          phone: newAdmin.phone.trim(),
          roleName: newAdmin.roleName,
          status: 'ACTIVE',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAdminDialogOpen(false);
      setNewAdmin({ username: '', fullName: '', email: '', phone: '', password: '', roleName: 'ADMIN' });
      await fetchUsers();
      alert('Administrator berhasil dibuat dan tersimpan di database.');
    } catch (err: any) {
      alert('Gagal membuat admin: ' + (err?.response?.data?.error || err?.response?.data?.message || err.message));
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!token) return;
    const ok = confirm('Hapus akun ini?');
    if (!ok) return;
    try {
      await axios.delete(`${apiUrl}/users/${id}?type=admin`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchUsers();
    } catch (err: any) {
      alert('Gagal menghapus user: ' + (err?.response?.data?.error || err?.response?.data?.message || err.message));
    }
  };

  const handleUpdateAdmin = async () => {
    if (!token || !editingAdmin) return;
    if (!String(editingAdmin.username || '').trim() || !String(editingAdmin.fullName || '').trim()) {
      alert('Username dan Nama wajib diisi.');
      return;
    }
    setIsUpdatingAdmin(true);
    try {
      await axios.put(
        `${apiUrl}/users/${editingAdmin.id}?type=admin`,
        {
          username: String(editingAdmin.username).trim().replace(/^@/, ''),
          fullName: String(editingAdmin.fullName).trim(),
          email: String(editingAdmin.email || '').trim(),
          phone: String(editingAdmin.phone || '').trim(),
          roleName: editingAdmin.roleName,
          status: editingAdmin.status,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setEditingAdmin(null);
      await fetchUsers();
      alert('Data administrator berhasil diperbarui.');
    } catch (err: any) {
      alert('Gagal memperbarui data: ' + (err?.response?.data?.error || err?.response?.data?.message || err.message));
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  const handleResetAdminPassword = async (user: any) => {
    if (!token) return;
    const newPassword = window.prompt(`Masukkan password baru untuk ${user.fullName || user.username} (minimal 8 karakter):`);
    if (newPassword === null) return;
    if (newPassword.length < 8) {
      alert('Password baru minimal 8 karakter.');
      return;
    }
    if (!confirm(`Simpan password baru untuk ${user.fullName || user.username}?`)) return;
    setResettingAdminId(Number(user.id));
    try {
      await axios.post(
        `${apiUrl}/users/${user.id}?type=admin`,
        { action: 'reset_password', newPassword },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert('Password berhasil diperbarui di database.');
    } catch (err: any) {
      alert('Gagal mereset password: ' + (err?.response?.data?.error || err?.response?.data?.message || err.message));
    } finally {
      setResettingAdminId(null);
    }
  };

  const handleMigrateAdminsFromUsers = async () => {
    if (!token) return;
    const ok = confirm('Pindahkan akun ADMIN/STAFF/PIMPINAN dari tabel users ke admin_users?');
    if (!ok) return;
    setIsMigratingAdmins(true);
    try {
      const res = await axios.post(
        `${apiUrl}/users`,
        { action: 'migrate_admins' },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = res.data || {};
      alert(
        `Migrasi selesai.\nDitemukan: ${data.found || 0}\nInsert: ${data.inserted || 0}\nUpdate: ${data.updated || 0}\nTerhapus dari users: ${data.deletedFromUsers || 0}` +
          (data.deleteError ? `\n\nCatatan: ${data.deleteError}` : ''),
      );
      await fetchUsers();
    } catch (err: any) {
      alert('Gagal migrasi: ' + (err?.response?.data?.error || err?.response?.data?.message || err.message));
    } finally {
      setIsMigratingAdmins(false);
    }
  };

  const activeMapRules = Object.values(settings.mapVisibility || {}).filter(Boolean).length;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[28px] border border-orange-100 bg-gradient-to-br from-white via-orange-50/70 to-amber-50 px-5 py-6 shadow-sm dark:border-orange-950 dark:from-zinc-950 dark:via-zinc-900 dark:to-orange-950/30 sm:px-7">
        <div className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <Settings2 className="size-6" />
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-3xl">Pengaturan Sistem</h1>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">Sistem aktif</span>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Kelola identitas aplikasi, aturan operasional, akses pengguna, dan keamanan data dari satu tempat.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[540px]">
            {[
              { icon: Building2, label: 'Kelurahan', value: settings.villageName || 'Belum diatur', tone: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300' },
              { icon: Users, label: 'Administrator', value: `${adminUsers.length} akun`, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300' },
              { icon: MapPin, label: 'Marker Map', value: `${activeMapRules}/4 aktif`, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300' },
              { icon: Clock3, label: 'Update GPS', value: `${settings.gpsUpdateInterval} detik`, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300' },
            ].map(({ icon: Icon, label, value, tone }) => (
              <div key={label} className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="flex items-center gap-2">
                  <span className={`flex size-8 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
                    <p className="truncate text-sm font-extrabold text-zinc-800 dark:text-zinc-100">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Tabs defaultValue="umum" className="w-full">
        <div className="sticky top-0 z-20 -mx-1 mb-6 overflow-x-auto px-1 py-2 backdrop-blur-xl">
        <TabsList className="grid w-full min-w-[900px] grid-cols-5 items-stretch gap-1 rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-sm group-data-horizontal/tabs:!h-14 dark:border-zinc-800 dark:bg-zinc-950/95">
          <TabsTrigger value="umum" className="!h-full rounded-xl px-4 font-bold text-zinc-500 data-active:bg-orange-500 data-active:text-white data-active:shadow-md">
            <Palette className="mr-2 size-4" /> Umum & Operasional
          </TabsTrigger>
          <TabsTrigger value="gps-map" className="!h-full rounded-xl px-4 font-bold text-zinc-500 data-active:bg-orange-500 data-active:text-white data-active:shadow-md">
            <MapPin className="mr-2 size-4" /> GPS & Live Map
          </TabsTrigger>
          <TabsTrigger value="role" className="!h-full rounded-xl px-4 font-bold text-zinc-500 data-active:bg-orange-500 data-active:text-white data-active:shadow-md">
            <Shield className="mr-2 size-4" /> Hak Akses Role
          </TabsTrigger>
          <TabsTrigger value="administrator" className="!h-full rounded-xl px-4 font-bold text-zinc-500 data-active:bg-orange-500 data-active:text-white data-active:shadow-md">
            <Users className="mr-2 size-4" /> Administrator
          </TabsTrigger>
          <TabsTrigger value="backup" className="!h-full rounded-xl px-4 font-bold text-zinc-500 data-active:bg-orange-500 data-active:text-white data-active:shadow-md">
            <HardDrive className="mr-2 size-4" /> Backup
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="umum" className="space-y-6">
          {/* Identitas Sistem */}
          <Card className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300"><Building2 className="size-5" /></span>
                <div><CardTitle>Identitas & Tampilan Sistem</CardTitle><CardDescription>Informasi utama yang tampil pada login, dashboard, laporan, dan PDF.</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-7 p-5 sm:p-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Logo & Warna Utama */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Upload Logo</label>
                    <div className="flex items-center gap-4">
                      <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 object-contain bg-zinc-50 rounded-xl border" />
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'logo');
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Warna Utama</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        className="w-12 h-12 p-1 rounded-lg border-none cursor-pointer"
                        value={settings.mainColor}
                        onChange={(e) => settings.setSettings({ mainColor: e.target.value })}
                      />
                      <Input 
                        value={settings.mainColor}
                        onChange={(e) => settings.setSettings({ mainColor: e.target.value })}
                        className="w-32 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 2: Background Login settings */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Upload Background Login</label>
                  <div className="flex items-center gap-2 mb-2">
                    <button 
                      onClick={() => settings.setSettings({ bgType: 'image' })}
                      className={`px-3 py-1 text-xs rounded-lg font-bold ${settings.bgType === 'image' ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}
                    >
                      Gambar
                    </button>
                    <button 
                      onClick={() => settings.setSettings({ bgType: 'video' })}
                      className={`px-3 py-1 text-xs rounded-lg font-bold ${settings.bgType === 'video' ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}
                    >
                      Video (YouTube)
                    </button>
                  </div>
                  {settings.bgType === 'image' ? (
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'bg');
                      }}
                    />
                  ) : (
                    <div className="space-y-4">
                      <Input 
                        type="text" 
                        placeholder="URL YouTube (contoh: https://www.youtube.com/watch?v=...)"
                        value={settings.bgVideo}
                        onChange={(e) => settings.setSettings({ bgVideo: e.target.value })}
                      />
                      <div className="space-y-2 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                        <div className="flex justify-between text-xs font-bold text-zinc-500">
                          <span>Volume Background Video</span>
                          <span>{settings.bgVideoVolume}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={settings.bgVideoVolume}
                            onChange={(e) => settings.setSettings({ bgVideoVolume: parseInt(e.target.value) })}
                            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          Catatan: Browser modern memblokir video bersuara agar tidak otomatis berputar. 
                          Mengatur volume &gt; 0 akan mengaktifkan audio setelah di-unmute oleh pemutar background.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Nama Sistem & Deskripsi Sistem */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Nama Sistem</label>
                  <Input 
                    value={settings.systemName}
                    onChange={(e) => settings.setSettings({ systemName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Deskripsi Sistem</label>
                  <Input 
                    value={settings.systemDescription}
                    onChange={(e) => settings.setSettings({ systemDescription: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-5 border-t border-zinc-100 pt-6 dark:border-zinc-800 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <label htmlFor="village-name" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Nama Kelurahan</label>
                <Input
                  id="village-name"
                  value={settings.villageName || ''}
                  maxLength={150}
                  onChange={(e) => settings.setSettings({ villageName: e.target.value })}
                  className="mt-2 bg-white dark:bg-zinc-900"
                  placeholder="Contoh: Petukangan Utara"
                  aria-describedby="village-name-help"
                />
                <p id="village-name-help" className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Nama ini digunakan pada halaman laporan, hasil ekspor, dan dokumen PDF.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <label htmlFor="officer-id-prefix" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Prefix ID Petugas</label>
                <Input
                  id="officer-id-prefix"
                  value={settings.officerIdPrefix}
                  maxLength={10}
                  onChange={(e) => settings.setSettings({ officerIdPrefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                  className="mt-2 uppercase bg-white dark:bg-zinc-900"
                  placeholder="PJLP"
                  aria-describedby="officer-id-prefix-help"
                />
                <p id="officer-id-prefix-help" className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Berlaku untuk petugas baru. Contoh: {settings.officerIdPrefix || 'PJLP'}001. ID petugas lama tetap sama.
                </p>
              </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Teks Footer</label>
                  <Input
                    value={settings.footerText || ''}
                    onChange={(e) => settings.setSettings({ footerText: e.target.value })}
                    placeholder={`Kosongkan untuk memakai ${settings.systemName || 'PPSU System'} © ${new Date().getFullYear()}`}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900 px-4 py-3">
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tampilkan Footer (Admin)</span>
                    <input
                      type="checkbox"
                      checked={settings.footerShowOnAdmin !== false}
                      onChange={(e) => settings.setSettings({ footerShowOnAdmin: e.target.checked })}
                      className="h-5 w-5 accent-orange-500"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900 px-4 py-3">
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tampilkan Footer (Login)</span>
                    <input
                      type="checkbox"
                      checked={settings.footerShowOnLogin !== false}
                      onChange={(e) => settings.setSettings({ footerShowOnLogin: e.target.checked })}
                      className="h-5 w-5 accent-orange-500"
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setting Jadwal dan Zona */}
          <Card className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50"><CheckCircle2 className="size-5" /></span>
                <div><CardTitle>Mode Absen Petugas</CardTitle><CardDescription>Tentukan apakah absen wajib mengikuti jadwal atau petugas bebas memilih shift.</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
              <div className="flex flex-col gap-3">
              <label htmlFor="attendance-mode" className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Aturan Absensi</label>
              <Select value={settings.attendanceMode} onValueChange={(value) => settings.setSettings({ attendanceMode: value as 'SCHEDULED' | 'FREE' })}>
                <SelectTrigger id="attendance-mode" className="w-full max-w-md">
                  <SelectValue placeholder="Pilih mode absen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="SCHEDULED">Sesuai Jadwal</SelectItem>
                    <SelectItem value="FREE">Absen Bebas — pilih shift saat masuk</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {settings.attendanceMode === 'FREE'
                  ? 'Petugas dapat absen tanpa jadwal penugasan, tetapi wajib memilih shift dari daftar shift sebelum absen masuk.'
                  : 'Absen masuk hanya tersedia untuk petugas yang dijadwalkan pada hari tersebut. Sesi yang sudah dimulai tetap bisa dilanjutkan.'}
              </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                <Info className="mt-0.5 size-5 shrink-0" />
                <p><strong>Dampak pengaturan:</strong> perubahan berlaku untuk proses absen berikutnya dan tidak mengubah riwayat absensi yang sudah tersimpan.</p>
              </div>
            </CardContent>
          </Card>

          {/* Setting Jadwal dan Zona */}
          <Card className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/50"><Clock3 className="size-5" /></span>
                <div><CardTitle>Shift & Zona Penugasan</CardTitle><CardDescription>Kelola pilihan shift kerja serta zona atau kategori penugasan lapangan.</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Shift Management Block */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Daftar Nama Shift & Waktu Mulai</label>
                  <div className="flex flex-wrap gap-2 min-h-[46px] p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {settings.shifts && settings.shifts.length > 0 ? (
                      settings.shifts.map((shift: any, idx) => {
                        const isObject = typeof shift === 'object' && shift !== null;
                        const shiftName = isObject ? shift.name : shift;
                        const shiftStartTime = isObject ? shift.startTime : null;
                        const shiftEndTime = isObject ? shift.endTime : null;
                        return (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 border shadow-sm"
                          >
                            <span className="flex items-center gap-1">
                              <span className="font-bold">{shiftName}</span>
                              {(shiftStartTime || shiftEndTime) && (
                                <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                                  {shiftStartTime || '--:--'} <span className="opacity-50">-</span> {shiftEndTime || '--:--'}
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = settings.shifts.filter((_, i) => i !== idx);
                                settings.setSettings({ shifts: updated });
                              }}
                              className="w-4 h-4 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              ×
                            </button>
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-xs text-zinc-400 p-1">Belum ada shift. Silakan tambah baru di bawah.</span>
                    )}
                  </div>
                  
                  {/* Input to Add Shift */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start gap-2">
                    <Input 
                      type="text" 
                      placeholder="Nama (contoh: Shift 1)" 
                      id="new-shift-name-input"
                      className="rounded-xl border-zinc-200 dark:border-zinc-800 w-full sm:w-40 shrink-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const nameInput = e.currentTarget;
                          const startTimeInput = document.getElementById('new-shift-time-input') as HTMLInputElement;
                          const endTimeInput = document.getElementById('new-shift-endtime-input') as HTMLInputElement;
                          const nameVal = nameInput.value.trim();
                          const startTimeVal = startTimeInput?.value.trim() || '08:00';
                          const endTimeVal = endTimeInput?.value.trim() || '16:00';
                          if (nameVal) {
                            const exists = settings.shifts?.some((s: any) => 
                              (typeof s === 'object' && s !== null ? s.name.toLowerCase() : s.toLowerCase()) === nameVal.toLowerCase()
                            );
                            if (exists) {
                              alert('Nama Shift sudah ada!');
                              return;
                            }
                            const newShift = { name: nameVal, startTime: startTimeVal, endTime: endTimeVal };
                            settings.setSettings({ shifts: [...(settings.shifts || []), newShift] });
                            nameInput.value = '';
                          } else {
                            alert('Silakan isi nama shift terlebih dahulu!');
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1 bg-white border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 shrink-0">
                        <span className="text-[10px] font-bold text-zinc-400 shrink-0">Mulai</span>
                        <Input
                          type="time"
                          id="new-shift-time-input"
                          defaultValue="08:00"
                          className="border-none w-[130px] shrink-0 p-0 h-9 focus-visible:ring-0 shadow-none text-sm"
                        />
                        <span className="text-[10px] font-bold text-zinc-400 border-l pl-1 shrink-0">Selesai</span>
                        <Input
                          type="time"
                          id="new-shift-endtime-input"
                          defaultValue="16:00"
                          className="border-none w-[130px] shrink-0 p-0 h-9 focus-visible:ring-0 shadow-none text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          const nameInput = document.getElementById('new-shift-name-input') as HTMLInputElement;
                          const startTimeInput = document.getElementById('new-shift-time-input') as HTMLInputElement;
                          const endTimeInput = document.getElementById('new-shift-endtime-input') as HTMLInputElement;
                          const nameVal = nameInput?.value.trim();
                          const startTimeVal = startTimeInput?.value.trim() || '08:00';
                          const endTimeVal = endTimeInput?.value.trim() || '16:00';
                          if (nameVal) {
                            const exists = settings.shifts?.some((s: any) => 
                              (typeof s === 'object' && s !== null ? s.name.toLowerCase() : s.toLowerCase()) === nameVal.toLowerCase()
                            );
                            if (exists) {
                              alert('Nama Shift sudah ada!');
                              return;
                            }
                            const newShift = { name: nameVal, startTime: startTimeVal, endTime: endTimeVal };
                            settings.setSettings({ shifts: [...(settings.shifts || []), newShift] });
                            nameInput.value = '';
                          } else {
                            alert('Silakan isi nama shift terlebih dahulu!');
                          }
                        }}
                        className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold px-4 shrink-0"
                      >
                        Tambah
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Zone Management Block */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Daftar Nama Zona atau Kategori</label>
                  <div className="flex flex-wrap gap-2 min-h-[46px] p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {settings.zones && settings.zones.length > 0 ? (
                      settings.zones.map((zone, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 border shadow-sm"
                        >
                          <span>{zone}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = settings.zones.filter((_, i) => i !== idx);
                              settings.setSettings({ zones: updated });
                            }}
                            className="w-4 h-4 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            ×
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 p-1">Belum ada zona atau kategori. Silakan tambah baru di bawah.</span>
                    )}
                  </div>
                  
                  {/* Input to Add Zone */}
                  <div className="flex gap-2">
                    <Input 
                      type="text" 
                      placeholder="Contoh: Zona A atau Kategori 1" 
                      id="new-zone-input"
                      className="rounded-xl border-zinc-200 dark:border-zinc-800"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const val = input.value.trim();
                          if (val) {
                            if (settings.zones.includes(val)) {
                              alert('Nama Zona atau Kategori sudah ada!');
                              return;
                            }
                            settings.setSettings({ zones: [...settings.zones, val] });
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('new-zone-input') as HTMLInputElement;
                        const val = input?.value.trim();
                        if (val) {
                          if (settings.zones.includes(val)) {
                            alert('Nama Zona sudah ada!');
                            return;
                          }
                          settings.setSettings({ zones: [...settings.zones, val] });
                          input.value = '';
                        }
                      }}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold px-4"
                    >
                      Tambah
                    </Button>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Maintenance System */}
          <Card className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/50"><MonitorSmartphone className="size-5" /></span>
                <div><CardTitle>Mode Pemeliharaan</CardTitle><CardDescription>Batasi akses sementara ketika sistem sedang diperbarui atau diperbaiki.</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div><p className="font-bold text-zinc-800 dark:text-zinc-100">Status pemeliharaan</p><p className="text-xs text-zinc-500">Admin tetap dapat mengakses sistem saat mode ini aktif.</p></div>
                <div className="flex items-center gap-3">
                <button
                  onClick={() => settings.setSettings({ maintenanceActive: !settings.maintenanceActive })}
                  className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors ${settings.maintenanceActive ? 'bg-orange-500' : 'bg-zinc-200'}`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${settings.maintenanceActive ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
                <span className="whitespace-nowrap font-bold text-zinc-700 dark:text-zinc-200">{settings.maintenanceActive ? 'Aktif' : 'Nonaktif'}</span>
                </div>
              </div>

              {Boolean(settings.maintenanceActive) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Batas Waktu Berakhir</label>
                    <Input 
                      type="datetime-local" 
                      value={settings.maintenanceEnd}
                      onChange={(e) => settings.setSettings({ maintenanceEnd: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Judul Tampilan Maintenance</label>
                    <Input 
                      value={settings.maintenanceTitle}
                      onChange={(e) => settings.setSettings({ maintenanceTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-zinc-700">Deskripsi Tampilan Maintenance</label>
                    <textarea 
                      className="w-full p-3 rounded-xl border border-zinc-200 min-h-[100px]"
                      value={settings.maintenanceDesc}
                      onChange={(e) => settings.setSettings({ maintenanceDesc: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GPS Tracking Update Interval */}
          <Card className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/50"><MapPin className="size-5" /></span>
                <div><CardTitle>Interval Pelacakan GPS</CardTitle><CardDescription>Atur frekuensi pengiriman lokasi petugas ke riwayat GPS dan Live Monitoring.</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Interval Update GPS (Detik)</label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={5}
                      max={300}
                      value={settings.gpsUpdateInterval}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 5 && val <= 300) {
                          settings.setSettings({ gpsUpdateInterval: val });
                        }
                      }}
                      className="w-32"
                    />
                    <span className="text-sm text-zinc-500 font-medium">detik</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Minimum 5 detik, maksimum 300 detik (5 menit). Semakin pendek interval, semakin real-time tracking-nya tapi semakin boros baterai.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">{settings.gpsUpdateInterval}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-700">Interval Saat Ini</p>
                    <p className="text-xs text-zinc-500">
                      {settings.gpsUpdateInterval >= 60
                        ? `${Math.floor(settings.gpsUpdateInterval / 60)} menit ${settings.gpsUpdateInterval % 60} detik`
                        : `${settings.gpsUpdateInterval} detik`}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Bar for Saving */}
          <div className="sticky bottom-4 z-10 flex justify-end rounded-2xl border border-zinc-200 bg-white/90 p-3 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold px-8 py-6 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Simpan Pengaturan
            </Button>
          </div>

        </TabsContent>

        <TabsContent value="gps-map" className="flex flex-col gap-6">
          <Card className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50"><MapPin className="size-5" /></span>
                <div><CardTitle>Tampilan Petugas di Live Monitoring</CardTitle><CardDescription>
                Tentukan pada status mana marker petugas ditampilkan di peta. Pengaturan ini tidak menghentikan pencatatan GPS atau absensi.
                </CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 sm:p-7 lg:grid-cols-2">
              {([
                { key: 'loggedIn', title: 'Petugas Login', description: 'Tampil setelah login, sebelum absen masuk.' },
                { key: 'checkedIn', title: 'Petugas Absen Masuk', description: 'Tampil saat bekerja, termasuk setelah selesai istirahat.' },
                { key: 'onBreak', title: 'Petugas Istirahat', description: 'Tampil selama status istirahat.' },
                { key: 'checkedOut', title: 'Petugas Absen Pulang', description: 'Tampilkan lokasi terakhir setelah absen pulang jika masih tersedia.' },
              ] as const).map(({ key, title, description }) => (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 transition-colors hover:bg-orange-50/60 dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="flex flex-col gap-1">
                    <span className="font-bold text-zinc-900 dark:text-white">{title}</span>
                    <span className="text-xs text-zinc-500">{description}</span>
                  </span>
                  <span className="relative shrink-0">
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label={`Tampilkan ${title.toLowerCase()} di peta`}
                      checked={settings.mapVisibility[key]}
                      onChange={(event) => settings.setSettings({
                        mapVisibility: { ...settings.mapVisibility, [key]: event.target.checked },
                      })}
                      className="peer sr-only"
                    />
                    <span aria-hidden="true" className="block h-7 w-12 rounded-full bg-zinc-300 transition-colors peer-checked:bg-orange-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-orange-500 after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
                  </span>
                </label>
              ))}
              <p className="col-span-full flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><Info className="size-4 shrink-0" /> Marker SOS darurat selalu ditampilkan. Petugas tanpa koordinat GPS tidak dapat ditampilkan di peta.</p>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving} className="rounded-xl bg-orange-500 font-bold text-white hover:bg-orange-600">
              {isSaving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
              Simpan Pengaturan GPS / Map
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <Card className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"><HardDrive className="size-5" /></span>
                <div><CardTitle>Backup Data & File</CardTitle><CardDescription>Amankan database dan media sistem secara berkala.</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-7">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setBackupType('db')}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all ${backupType === 'db' ? 'border border-orange-200 bg-orange-50 text-orange-600' : 'border border-transparent bg-zinc-50 text-zinc-600'}`}
                >
                  <Database className="size-5" /> Backup Database
                </button>
                <button
                  onClick={() => setBackupType('file')}
                  className={`flex items-center gap-2 rounded-xl px-6 py-3 font-bold transition-all ${backupType === 'file' ? 'border border-orange-200 bg-orange-50 text-orange-600' : 'border border-transparent bg-zinc-50 text-zinc-600'}`}
                >
                  <FileArchive className="size-5" /> Backup File & Media
                </button>
              </div>

              <div className="space-y-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/40 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{backupType === 'db' ? 'Export SQL Database' : 'Zip Semua File System'}</h3>
                    <p className="text-sm text-zinc-500">{backupType === 'db' ? 'Proses ini akan mengekspor tabel dan data ke /public/backup' : 'Proses ini akan mengompres seluruh source code ke /public/backup'}</p>
                  </div>
                  <Button onClick={handleBackup} disabled={backupType === 'db' ? dbBackup.isBackingUp : fileBackup.isBackingUp} className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800">
                    {(backupType === 'db' ? dbBackup.isBackingUp : fileBackup.isBackingUp) ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                    Mulai Backup
                  </Button>
                </div>

                {(backupType === 'db' ? dbBackup.isBackingUp : fileBackup.isBackingUp) && (
                  <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                    <div className="flex justify-between text-sm font-bold text-zinc-700 dark:text-zinc-200">
                      <span>Proses {backupType === 'db' ? 'Export Database' : 'Zipping Files'}...</span>
                      <span>{backupType === 'db' ? dbBackup.progress : fileBackup.progress}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div className="h-3 rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${backupType === 'db' ? dbBackup.progress : fileBackup.progress}%` }} />
                    </div>
                  </div>
                )}

                {(backupType === 'db' ? dbBackup.complete : fileBackup.complete) && (
                  <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 pt-4 sm:flex-row">
                    <div className="flex items-center gap-3 font-medium text-emerald-700">
                      <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100"><Download className="size-4" /></div>
                      <div><p className="font-bold">Backup Selesai!</p><p className="text-xs opacity-80">{backupType === 'db' ? dbBackup.fileName : fileBackup.fileName}</p></div>
                    </div>
                    <Button className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleDownload}>Download File</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="role" className="space-y-6">
          <Card className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/50"><Shield className="size-5" /></span>
                <div><CardTitle>Akses Halaman Berdasarkan Role</CardTitle><CardDescription>Atur menu dan halaman yang dapat dibuka oleh STAFF dan PIMPINAN.</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-7">
              {(['STAFF', 'PIMPINAN'] as const).map((r) => (
                <div key={r} className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-zinc-900 dark:text-white">{r}</p>
                      <p className="text-xs text-zinc-500">Kontrol menu & akses halaman untuk role ini.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900 px-4 py-3">
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Izin Edit</span>
                      <input
                        type="checkbox"
                        checked={settings.rolePermissions?.[r]?.canEdit !== false}
                        onChange={(e) => {
                          const next = { ...(settings.rolePermissions || {}) };
                          next[r] = { ...(next[r] || { canEdit: true, canDelete: true }), canEdit: e.target.checked };
                          settings.setSettings({ rolePermissions: next });
                        }}
                        className="h-5 w-5 accent-orange-500"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900 px-4 py-3">
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Izin Hapus</span>
                      <input
                        type="checkbox"
                        checked={settings.rolePermissions?.[r]?.canDelete !== false}
                        onChange={(e) => {
                          const next = { ...(settings.rolePermissions || {}) };
                          next[r] = { ...(next[r] || { canEdit: true, canDelete: true }), canDelete: e.target.checked };
                          settings.setSettings({ rolePermissions: next });
                        }}
                        className="h-5 w-5 accent-orange-500"
                      />
                    </label>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ROLE_PAGES.map((p) => {
                      const checked = settings.roleAccess?.[r]?.[p.href] !== false;
                      return (
                        <label
                          key={p.href}
                          className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900 px-4 py-3"
                        >
                          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{p.label}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setRoleAccess(r, p.href, e.target.checked)}
                            className="h-5 w-5 accent-orange-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Pengaturan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="administrator">
          <Card className="border-none shadow-xl bg-white dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-xl">Akses Administrator</CardTitle>
                <CardDescription>Manajemen akses untuk Role Admin, Staff, dan Pimpinan</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleMigrateAdminsFromUsers}
                  disabled={isMigratingAdmins}
                >
                  {isMigratingAdmins ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Migrasi dari Users
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                  onClick={() => setAdminDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Tambah Admin
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-zinc-100">
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((user) => (
                    <TableRow key={user.id} className="border-zinc-50 hover:bg-zinc-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-bold">
                            {user.fullName.charAt(0)}
                          </div>
                          <span className="font-semibold">{user.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-500">@{user.username}</TableCell>
                      <TableCell>
                        {(() => {
                          const roleName = String(user.roleName || user.role?.name || user.role || '');
                          const badgeCls =
                            roleName === 'ADMIN'
                              ? 'border-red-200 text-red-600 bg-red-50'
                              : roleName === 'PIMPINAN'
                                ? 'border-blue-200 text-blue-600 bg-blue-50'
                                : 'border-green-200 text-green-600 bg-green-50';
                          return (
                            <Badge variant="outline" className={`rounded-md px-2 font-medium ${badgeCls}`}>
                              {roleName}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500' : 'bg-zinc-300'}`} />
                          <span className="text-xs font-bold">{user.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-orange-500"
                            title="Edit administrator"
                            onClick={() => setEditingAdmin({ ...user })}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-blue-600"
                            title="Atur password baru"
                            onClick={() => handleResetAdminPassword(user)}
                            disabled={resettingAdminId === Number(user.id)}
                          >
                            {resettingAdminId === Number(user.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-red-500"
                            onClick={() => handleDeleteAdmin(Number(user.id))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {adminUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-zinc-400">
                        Belum ada data administrator.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
            <DialogContent className="max-w-lg rounded-3xl">
              <DialogHeader>
                <DialogTitle>Tambah Admin</DialogTitle>
                <DialogDescription>Seluruh data akun dan password terenkripsi disimpan di MySQL.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Username</label>
                  <Input
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin((p) => ({ ...p, username: e.target.value.replace(/\s+/g, '') }))}
                    placeholder="Username tanpa spasi"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Nama</label>
                  <Input
                    value={newAdmin.fullName}
                    onChange={(e) => setNewAdmin((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="Nama lengkap"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Password</label>
                  <Input
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Email</label>
                  <Input
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@contoh.com"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">No HP</label>
                  <Input
                    value={newAdmin.phone}
                    onChange={(e) => setNewAdmin((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="08xxxxxxxxxx"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Role</label>
                  <select
                    className="flex h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newAdmin.roleName}
                    onChange={(e) => setNewAdmin((p) => ({ ...p, roleName: e.target.value }))}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="STAFF">STAFF</option>
                    <option value="PIMPINAN">PIMPINAN</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setAdminDialogOpen(false)}
                    disabled={isCreatingAdmin}
                  >
                    Batal
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                    onClick={handleCreateAdmin}
                    disabled={isCreatingAdmin}
                  >
                    {isCreatingAdmin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Buat Admin
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={Boolean(editingAdmin)} onOpenChange={(open) => !open && setEditingAdmin(null)}>
            <DialogContent className="max-w-lg rounded-3xl">
              <DialogHeader>
                <DialogTitle>Edit Administrator</DialogTitle>
                <DialogDescription>Perbarui identitas, role, dan status akun.</DialogDescription>
              </DialogHeader>
              {editingAdmin && (
                <div className="space-y-4">
                  {[
                    ['username', 'Username', 'Username tanpa spasi'],
                    ['fullName', 'Nama', 'Nama lengkap'],
                    ['email', 'Email', 'email@contoh.com'],
                    ['phone', 'No HP', '08xxxxxxxxxx'],
                  ].map(([field, label, placeholder]) => (
                    <div className="space-y-2" key={field}>
                      <label className="text-sm font-bold text-zinc-700">{label}</label>
                      <Input
                        value={editingAdmin[field] || ''}
                        onChange={(e) => setEditingAdmin((previous: any) => ({ ...previous, [field]: field === 'username' ? e.target.value.replace(/\s+/g, '') : e.target.value }))}
                        placeholder={placeholder}
                        className="rounded-xl h-12"
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Role</label>
                      <select className="flex h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold" value={editingAdmin.roleName} onChange={(e) => setEditingAdmin((p: any) => ({ ...p, roleName: e.target.value }))}>
                        <option value="ADMIN">ADMIN</option><option value="STAFF">STAFF</option><option value="PIMPINAN">PIMPINAN</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Status</label>
                      <select className="flex h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold" value={editingAdmin.status} onChange={(e) => setEditingAdmin((p: any) => ({ ...p, status: e.target.value }))}>
                        <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => setEditingAdmin(null)} disabled={isUpdatingAdmin}>Batal</Button>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl" onClick={handleUpdateAdmin} disabled={isUpdatingAdmin}>
                      {isUpdatingAdmin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Simpan Perubahan
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
