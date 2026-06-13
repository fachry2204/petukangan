'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Plus, Edit2, Trash2, Upload, Database, FileArchive, Download, Loader2, Save } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { Input } from '@/components/ui/input';
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
  const [newAdmin, setNewAdmin] = useState({
    fullName: '',
    email: '',
    phone: '',
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
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
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
        mainColor: settings.mainColor,
        maintenanceActive: settings.maintenanceActive,
        maintenanceEnd: settings.maintenanceEnd,
        maintenanceTitle: settings.maintenanceTitle,
        maintenanceDesc: settings.maintenanceDesc,
        gpsUpdateInterval: settings.gpsUpdateInterval,
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
    if (!newAdmin.fullName.trim() || !newAdmin.email.trim() || !newAdmin.phone.trim()) {
      alert('Nama, Email, dan No HP wajib diisi.');
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
          username: newAdmin.email.trim(),
          password: '1234',
          fullName: newAdmin.fullName.trim(),
          email: newAdmin.email.trim(),
          phone: newAdmin.phone.trim(),
          roleName: newAdmin.roleName,
          status: 'ACTIVE',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAdminDialogOpen(false);
      setNewAdmin({ fullName: '', email: '', phone: '', roleName: 'ADMIN' });
      await fetchUsers();
      alert('Admin berhasil dibuat. Password default: 1234');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Pengaturan Sistem</h1>
        <p className="text-zinc-500">Konfigurasi sistem dan manajemen akses Administrator.</p>
      </div>

      <Tabs defaultValue="umum" className="w-full">
        <TabsList className="bg-zinc-100 dark:bg-zinc-900 mb-6 p-1 rounded-xl h-12">
          <TabsTrigger value="umum" className="rounded-lg h-10 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Umum
          </TabsTrigger>
          <TabsTrigger value="role" className="rounded-lg h-10 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Role
          </TabsTrigger>
          <TabsTrigger value="administrator" className="rounded-lg h-10 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Shield className="w-4 h-4 mr-2" /> Administrator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="umum" className="space-y-6">
          {/* Identitas Sistem */}
          <Card className="border-none shadow-xl bg-white dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl">
            <CardHeader>
              <CardTitle>Identitas Sistem</CardTitle>
              <CardDescription>Atur logo, nama sistem, dan warna utama aplikasi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

              <div className="pt-4 border-t border-zinc-100 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Teks Footer</label>
                  <Input
                    value={settings.footerText || ''}
                    onChange={(e) => settings.setSettings({ footerText: e.target.value })}
                    placeholder="Contoh: Kelurahan Petukangan Utara © 2026"
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
          <Card className="border-none shadow-xl bg-white dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl">
            <CardHeader>
              <CardTitle>Setting Jadwal dan Zona atau Kategori</CardTitle>
              <CardDescription>Kelola daftar nama shift dan nama zona atau kategori penugasan petugas lapangan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
          <Card className="border-none shadow-xl bg-white dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle>Maintenance System</CardTitle>
              <CardDescription>Aktifkan mode pemeliharaan agar pengguna selain Admin tidak dapat mengakses sistem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => settings.setSettings({ maintenanceActive: !settings.maintenanceActive })}
                  className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors ${settings.maintenanceActive ? 'bg-orange-500' : 'bg-zinc-200'}`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${settings.maintenanceActive ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
                <span className="font-bold text-zinc-700">{settings.maintenanceActive ? 'Maintenance Aktif' : 'Maintenance Non-Aktif'}</span>
              </div>

              {settings.maintenanceActive && (
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
          <Card className="border-none shadow-xl bg-white dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle>Update Riwayat GPS</CardTitle>
              <CardDescription>Atur interval waktu (dalam detik) untuk update lokasi GPS petugas PPSU ke sistem tracking dan riwayat GPS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
          <div className="flex justify-end mt-4 mb-6">
            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold px-8 py-6 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Simpan Pengaturan
            </Button>
          </div>

          {/* Backup Data */}
          <Card className="border-none shadow-xl bg-white dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl">
            <CardHeader>
              <CardTitle>Backup Data & File</CardTitle>
              <CardDescription>Amankan data database dan seluruh file sistem secara rutin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setBackupType('db')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${backupType === 'db' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-zinc-50 text-zinc-600 border border-transparent'}`}
                >
                  <Database className="w-5 h-5" /> Backup Database
                </button>
                <button
                  onClick={() => setBackupType('file')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${backupType === 'file' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-zinc-50 text-zinc-600 border border-transparent'}`}
                >
                  <FileArchive className="w-5 h-5" /> Backup File & Media
                </button>
              </div>

              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-zinc-800">
                      {backupType === 'db' ? 'Export SQL Database' : 'Zip Semua File System'}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      {backupType === 'db' ? 'Proses ini akan mengekspor tabel dan data ke /public/backup' : 'Proses ini akan meng-compress seluruh source code ke /public/backup'}
                    </p>
                  </div>
                  <Button 
                    onClick={handleBackup} 
                    disabled={backupType === 'db' ? dbBackup.isBackingUp : fileBackup.isBackingUp}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl"
                  >
                    {(backupType === 'db' ? dbBackup.isBackingUp : fileBackup.isBackingUp) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Mulai Backup
                  </Button>
                </div>

                {(backupType === 'db' ? dbBackup.isBackingUp : fileBackup.isBackingUp) && (
                  <div className="space-y-2 pt-4 border-t border-zinc-200">
                    <div className="flex justify-between text-sm font-bold text-zinc-700">
                      <span>Proses {backupType === 'db' ? 'Export Database' : 'Zipping Files'}...</span>
                      <span>{backupType === 'db' ? dbBackup.progress : fileBackup.progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-orange-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${backupType === 'db' ? dbBackup.progress : fileBackup.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {(backupType === 'db' ? dbBackup.complete : fileBackup.complete) && (
                  <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-3 text-emerald-700 font-medium">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold">Backup Selesai!</p>
                        <p className="text-xs opacity-80">{backupType === 'db' ? dbBackup.fileName : fileBackup.fileName}</p>
                      </div>
                    </div>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                      onClick={handleDownload}
                    >
                      Download File
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="role" className="space-y-6">
          <Card className="border-none shadow-xl bg-white dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl">
            <CardHeader>
              <CardTitle>Akses Halaman Berdasarkan Role</CardTitle>
              <CardDescription>Aktifkan / nonaktifkan halaman admin untuk role STAFF dan PIMPINAN.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-orange-500">
                            <Edit2 className="w-4 h-4" />
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
                <DialogDescription>Password default otomatis: 1234</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
