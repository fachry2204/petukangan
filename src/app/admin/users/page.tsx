'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Search, Filter, Eye, Calendar, Phone, MapPin, User as UserIcon, CalendarDays, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { useRealtime } from '@/hooks/use-realtime';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { apiUrl } from '@/lib/api-config';
import * as XLSX from 'xlsx';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<any | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [selectedUserForStatus, setSelectedUserForStatus] = useState<any | null>(null);
  const [pendingStatus, setPendingStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusChangedAtInput, setStatusChangedAtInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const { token } = useAuthStore();
  const { toast } = useToast();

  const fetchUsers = async () => {
    console.log('[AdminUsers] fetchUsers called. token=', token ? 'exists' : 'missing');
    try {
      const res = await axios.get(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[AdminUsers] API success, count:', res.data?.length);
      setUsers(res.data);
    } catch (error: any) {
      console.error('[AdminUsers] Failed to fetch users', error?.response?.status, error?.response?.data, error?.message);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  // Realtime updates for users
  useRealtime((event) => {
    if (event.entity === 'user') {
      toast({
        title: 'Data Petugas Diperbarui',
        description: `Petugas ${event.action === 'create' ? 'baru ditambahkan' : event.action === 'update' ? 'diperbarui' : 'dihapus'}`,
      });
      fetchUsers();
    }
  }, ['user']);

  const handleDelete = async () => {
    if (!selectedUserForDelete || !token) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${apiUrl}/users/${selectedUserForDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'Berhasil', description: 'Data Petugas berhasil dihapus' });
      setIsDeleteOpen(false);
      setSelectedUserForDelete(null);
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal menghapus data petugas', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      let successCount = 0;
      let failCount = 0;

      for (const row of rows) {
        const fullName = row.Nama || row.fullName || row.name || 'Tanpa Nama';
        const email = row.Email || row.email || '';
        const phoneRaw = row.Phone || row.Telepon || row.NoHP || row.phone || '';
        
        let formattedPhone = String(phoneRaw);
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '62' + formattedPhone.substring(1);
        }

        const generatedUsername = `ppsu-${fullName.toLowerCase().replace(/[^a-z0-9]/gi, '')}-${Math.floor(Math.random() * 10000)}`;

        try {
          await axios.post(`${apiUrl}/users`, {
            username: generatedUsername,
            password: '1234',
            fullName: fullName,
            email: email,
            phone: formattedPhone,
            roleName: 'PPSU',
            status: 'ACTIVE',
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
        } catch (err) {
          console.error('Failed to import user', row, err);
          failCount++;
        }
      }

      toast({ 
        title: 'Import Selesai', 
        description: `Berhasil: ${successCount}, Gagal: ${failCount}` 
      });
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal membaca file Excel', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      e.target.value = ''; // reset input
    }
  };


  const handleStatusChangeClick = (user: any, newStatus: string) => {
    if (newStatus === 'ACTIVE') {
      executeStatusUpdate(user.id, 'ACTIVE', '', null);
    } else {
      setSelectedUserForStatus(user);
      setPendingStatus(newStatus);
      setStatusReason('');
      
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      const localISODate = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
      setStatusChangedAtInput(localISODate);
      setIsReasonOpen(true);
    }
  };

  const executeStatusUpdate = async (userId: number, status: string, reason: string, customDateISO?: string | null) => {
    setIsUpdatingStatus(true);
    const changedAt = status === 'ACTIVE' ? null : (customDateISO || new Date().toISOString());
    try {
      await axios.put(`${apiUrl}/users/${userId}`, { 
        status, 
        statusReason: reason || null,
        statusChangedAt: changedAt
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({ title: 'Berhasil', description: 'Status petugas berhasil diperbarui' });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status, statusReason: reason || null, statusChangedAt: changedAt } : u));
      setIsReasonOpen(false);
      setSelectedUserForStatus(null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal', description: 'Gagal memperbarui status petugas', variant: 'destructive' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900';
      case 'INACTIVE':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900';
      case 'DISMISSED':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900';
      default:
        return 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    }
  };

  const filteredUsers = users.filter(u => {
    const role = (u.roleName || u.role?.name || '').toUpperCase();
    return role === 'PPSU' && (
      (u.fullName || '').toLowerCase().includes(search.toLowerCase()) || 
      (u.username || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Petugas</h1>
          <p className="text-zinc-500">Manajemen akun PPSU, Staff, dan Pimpinan</p>
        </div>
        
        <div className="flex gap-3">
          <input 
            type="file" 
            id="excel-upload" 
            accept=".xlsx, .xls" 
            className="hidden" 
            onChange={handleImportExcel} 
            disabled={isImporting}
          />
          <Button 
            variant="outline" 
            className="rounded-xl h-12 px-6 border-zinc-200"
            onClick={() => document.getElementById('excel-upload')?.click()}
            disabled={isImporting}
          >
            {isImporting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileText className="w-5 h-5 mr-2" />}
            Import Excel
          </Button>
          <Link href="/admin/users/add">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 px-6">
              <Plus className="w-5 h-5 mr-2" /> Tambah Petugas
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input 
                placeholder="Cari nama atau username..." 
                className="pl-10 rounded-xl bg-zinc-50 border-none h-11"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="rounded-xl h-11 border-zinc-100">
              <Filter className="w-4 h-4 mr-2" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-zinc-100">
                  <TableHead className="w-[80px]">Foto</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Nama Petugas</TableHead>
                  <TableHead>No HP</TableHead>
                  <TableHead>Tanggal Gabung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[140px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                    <TableCell>
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.fullName} className="w-10 h-10 rounded-xl object-contain border border-zinc-100 bg-zinc-50" />
                      ) : (
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center font-bold text-orange-600 border border-orange-200">
                          {user.fullName.charAt(0)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-zinc-700">{user.username}</TableCell>
                    <TableCell className="font-bold text-zinc-950">{user.fullName}</TableCell>
                    <TableCell className="text-zinc-600 font-medium">
                      <div className="flex items-center gap-2">
                        {user.phone || '-'}
                        {user.phone && (
                          <a
                            href={`https://wa.me/${user.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-6 h-6 bg-green-500 rounded-full hover:bg-green-600 transition-colors"
                            title="Chat WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.3A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.13 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {user.joinDate ? (() => {
                        const d = new Date(user.joinDate);
                        const dd = String(d.getDate()).padStart(2, '0');
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const yyyy = d.getFullYear();
                        return `${dd}-${mm}-${yyyy}`;
                      })() : '-'}
                    </TableCell>
                    <TableCell>
                      <select
                        value={user.status || 'ACTIVE'}
                        onChange={(e) => handleStatusChangeClick(user, e.target.value)}
                        className={`font-extrabold text-[11px] px-3 py-1.5 rounded-full border cursor-pointer outline-none transition-all ${getStatusBadgeStyle(user.status || 'ACTIVE')}`}
                      >
                        <option value="ACTIVE" className="bg-white text-zinc-900 font-semibold">Aktif</option>
                        <option value="INACTIVE" className="bg-white text-zinc-900 font-semibold">Tidak Aktif</option>
                        <option value="DISMISSED" className="bg-white text-zinc-900 font-semibold">Dikeluarkan</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDetailOpen(true);
                        }}
                        className="h-9 w-9 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Link href={`/admin/users/edit/${user.id}`}>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setSelectedUserForDelete(user);
                          setIsDeleteOpen(true);
                        }}
                        className="h-9 w-9 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-zinc-400">
                    Belum ada data petugas lapangan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Petugas Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl md:max-w-5xl rounded-3xl p-0 overflow-hidden border-none bg-white dark:bg-zinc-950 shadow-2xl">
          <DialogTitle className="sr-only">Detail Petugas</DialogTitle>
          {selectedUser && (
            <div>
              {/* Header Profile Section */}
              <div className="relative bg-zinc-900 px-8 py-10 text-white flex items-center gap-6">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600/90 to-orange-500/80 mix-blend-multiply" />
                
                <div className="relative z-10">
                  {selectedUser.photoUrl ? (
                    <img
                      src={selectedUser.photoUrl}
                      alt={selectedUser.fullName}
                      className="h-32 w-auto max-w-full rounded-2xl object-contain border-4 border-white/20 shadow-lg bg-white/10"
                    />
                  ) : (
                    <div className="h-32 w-32 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-3xl text-white border-2 border-white/20 shadow-lg">
                      {selectedUser.fullName.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="relative z-10 space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-orange-200 bg-orange-500/30 px-3 py-1 rounded-full backdrop-blur-sm">
                    {selectedUser.username}
                  </span>
                  <h2 className="text-2xl font-black tracking-tight">{selectedUser.fullName}</h2>
                  <p className="text-sm text-zinc-100 font-medium">Petugas PPSU SMART MONITORING</p>
                </div>
              </div>

              {/* Body Details Section */}
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  {/* Personal details grid */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-medium">Jenis Kelamin</span>
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{selectedUser.gender || 'Laki-laki'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-medium">Tanggal Lahir</span>
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                          {selectedUser.birthDate ? new Date(selectedUser.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-medium">No. Handphone</span>
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{selectedUser.phone || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-medium">Tanggal Bergabung</span>
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                          {selectedUser.joinDate ? new Date(selectedUser.joinDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-medium">Alamat</span>
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">{selectedUser.address || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status & Alasan Non-Aktif Section */}
                {selectedUser.status !== 'ACTIVE' && (
                  <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 space-y-3">
                    <h4 className="font-extrabold text-xs text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                      Status: Petugas {selectedUser.status === 'INACTIVE' ? 'Tidak Aktif' : 'Dikeluarkan'}
                    </h4>
                    {selectedUser.statusChangedAt && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">Tanggal Perubahan Status:</span>
                        <p className="text-sm text-rose-900 dark:text-rose-350 font-bold">
                          {(() => {
                            const d = new Date(selectedUser.statusChangedAt);
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            return `${day}-${month}-${year}`;
                          })()}
                        </p>
                      </div>
                    )}
                    {selectedUser.statusReason && (
                      <div className="space-y-0.5 pt-2 border-t border-rose-100/30">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400">Alasan:</span>
                        <p className="text-sm text-rose-900 dark:text-rose-300 font-semibold leading-relaxed">
                          {selectedUser.statusReason}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Supporting Documents Section */}
                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900 space-y-4">
                  <h3 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    Dokumen Pendukung
                  </h3>
                  
                  {selectedUser.documents && (
                    <div className="grid grid-cols-2 gap-4">
                      {(() => {
                        try {
                          const docs = typeof selectedUser.documents === 'string' ? JSON.parse(selectedUser.documents) : selectedUser.documents;
                          if (Array.isArray(docs)) {
                            return docs.map((doc: any, i: number) => (
                              <a 
                                key={i} 
                                href={doc.base64 || doc.url || '#'} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-100/50 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:border-zinc-800 transition-all group"
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200 group-hover:text-orange-500 transition-colors">
                                    {doc.description || `Dokumen ${i+1}`}
                                  </span>
                                  <span className="text-xs text-zinc-400 truncate max-w-[180px]">{doc.fileName || 'Lampiran'}</span>
                                </div>
                                <span className="text-xs font-bold text-orange-500 bg-orange-50 group-hover:bg-orange-100 px-2.5 py-1 rounded-lg">
                                  Lihat
                                </span>
                              </a>
                            ));
                          }
                        } catch (e) {
                          console.error(e);
                        }
                        return <p className="text-sm text-zinc-400 italic">Tidak ada dokumen pendukung yang diunggah.</p>;
                      })()}
                    </div>
                  )}

                  {!selectedUser.documents && (
                    <p className="text-sm text-zinc-400 italic">Tidak ada dokumen pendukung yang diunggah.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Warning Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none bg-white dark:bg-zinc-950 shadow-2xl space-y-4">
          <DialogTitle className="sr-only">Konfirmasi Hapus</DialogTitle>
          <div className="flex items-start gap-4 pt-2">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">Hapus Petugas?</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Apakah Anda yakin ingin menghapus petugas <strong className="text-zinc-900 dark:text-zinc-100">{selectedUserForDelete?.fullName}</strong> ({selectedUserForDelete?.username})? Tindakan ini permanen dan data yang dihapus tidak dapat dipulihkan.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteOpen(false)} 
              disabled={isDeleting}
              className="rounded-xl h-11 px-5 font-semibold text-zinc-600 dark:text-zinc-400"
            >
              Batal
            </Button>
            <Button 
              type="button" 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl h-11 px-6 font-semibold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus Permanen'
              )}
            </Button>
          </div>
         </DialogContent>
      </Dialog>

      {/* Alasan Status Dialog */}
      <Dialog open={isReasonOpen} onOpenChange={setIsReasonOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none bg-white dark:bg-zinc-950 shadow-2xl space-y-4">
          <DialogTitle className="sr-only">Ubah Status Petugas</DialogTitle>
          <div className="flex items-start gap-4 pt-2">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              pendingStatus === 'INACTIVE'
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-500'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">
                Alasan Perubahan Status
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Berikan alasan mengapa status petugas <strong className="text-zinc-900 dark:text-zinc-100">{selectedUserForStatus?.fullName}</strong> diubah menjadi <strong className="text-zinc-900 dark:text-zinc-100">{pendingStatus === 'INACTIVE' ? 'Tidak Aktif' : 'Dikeluarkan'}</strong>.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tanggal Perubahan Status *</label>
            <input
              type="date"
              className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-none outline-none text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-orange-500/20"
              value={statusChangedAtInput}
              onChange={(e) => setStatusChangedAtInput(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tulis Alasan *</label>
            <textarea
              className="w-full min-h-[100px] p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-none resize-none focus:ring-2 focus:ring-orange-500/20 outline-none text-sm font-semibold text-zinc-850 dark:text-zinc-200"
              placeholder={`Contoh: Sedang sakit keras, melanggar aturan berat, dll...`}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsReasonOpen(false);
                setSelectedUserForStatus(null);
              }} 
              disabled={isUpdatingStatus}
              className="rounded-xl h-11 px-5 font-semibold text-zinc-600 dark:text-zinc-400"
            >
              Batal
            </Button>
            <Button 
              type="button" 
              onClick={() => executeStatusUpdate(selectedUserForStatus?.id, pendingStatus, statusReason, new Date(statusChangedAtInput).toISOString())} 
              disabled={isUpdatingStatus || !statusReason.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-11 px-6 font-semibold"
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
