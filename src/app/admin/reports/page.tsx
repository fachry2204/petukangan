'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, MapPin, Calendar, User2, Map, Eye, Trash2, Loader2, AlertCircle, X } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { useRealtime } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api-config';

export default function AdminReportsPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const apiUrl = apiUrl || 'http://localhost:3001/api';

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Fetch reports
  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${apiUrl}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Reports response:', res.data);
      setReports(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError(err?.response?.data?.message || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  // Realtime updates for reports
  useRealtime((event) => {
    if (event.entity === 'report') {
      toast({
        title: 'Data Laporan Diperbarui',
        description: `Laporan ${event.action === 'create' ? 'baru masuk' : event.action === 'update' ? 'diperbarui' : 'dihapus'}`,
      });
      fetchReports();
    }
  }, ['report']);

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const hay = `${report.title || ''} ${report.description || ''} ${report.user?.fullName || ''} ${report.address || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      const from = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null;
      const to = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : null;
      const reportDate = report.createdAt ? new Date(report.createdAt) : null;

      if (from && reportDate && reportDate < from) return false;
      if (to && reportDate && reportDate > to) return false;

      if (statusFilter !== 'ALL' && report.status !== statusFilter) return false;

      return true;
    }).sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [reports, search, filterStartDate, filterEndDate, statusFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus laporan ini?')) return;
    try {
      await axios.delete(`${apiUrl}/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal menghapus laporan');
    }
  };

  const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Menunggu',
    REVIEWED: 'Ditinjau',
    RESOLVED: 'Selesai',
    REJECTED: 'Ditolak',
  };

  const STATUS_COLOR: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    REVIEWED: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Laporan Kejadian</h1>
        <p className="text-zinc-500">Tinjau laporan masalah dan kejadian dari lapangan.</p>
      </div>

      {/* Filters Area */}
      <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">

          {/* Search bar */}
          <div className="flex-1 flex flex-col gap-1 w-full">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Cari Laporan / Petugas</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Cari kata kunci..."
                className="pl-11 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 font-medium focus-visible:ring-orange-500 shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1 w-full md:w-48">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Status Laporan</label>
            <select
              className="rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 px-3 font-medium focus-visible:ring-orange-500 shadow-sm text-zinc-600 dark:text-zinc-300 outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="REVIEWED">Ditinjau</option>
              <option value="RESOLVED">Selesai</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>

          {/* Date Picker filter Range */}
          <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
            <div className="flex flex-col gap-1 w-full md:w-40">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Tanggal Mulai</label>
              <Input
                type="date"
                className="rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 font-medium focus-visible:ring-orange-500 shadow-sm text-zinc-600 dark:text-zinc-300"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 w-full md:w-40">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Tanggal Akhir</label>
              <Input
                type="date"
                className="rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 font-medium focus-visible:ring-orange-500 shadow-sm text-zinc-600 dark:text-zinc-300"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
              />
            </div>
          </div>

          {(search || filterStartDate || filterEndDate || statusFilter !== 'ALL') && (
            <Button
              variant="ghost"
              onClick={() => { setSearch(''); setFilterStartDate(''); setFilterEndDate(''); setStatusFilter('ALL'); }}
              className="h-11 px-4 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold rounded-2xl shrink-0"
            >
              Reset
            </Button>
          )}

        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="border-none shadow-xl rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl overflow-hidden">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
          <CardTitle>Daftar Laporan ({filteredReports.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading} className="gap-1.5">
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center text-sm text-red-500 flex flex-col items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              {error}
            </div>
          ) : loading && reports.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-400">Memuat data laporan...</div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-400 italic">
              {reports.length === 0
                ? 'Belum ada laporan yang masuk.'
                : 'Tidak ada laporan yang cocok dengan filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-zinc-100">
                    <TableHead className="w-[120px]">Tanggal</TableHead>
                    <TableHead>Judul Laporan</TableHead>
                    <TableHead>Nama Petugas</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[140px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => {
                    const statusKey = report.status || 'PENDING';
                    const statusColor = STATUS_COLOR[statusKey] || 'bg-zinc-100 text-zinc-700';
                    return (
                      <TableRow key={report.id} className="border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="text-zinc-500 text-sm">
                          {report.createdAt ? new Date(report.createdAt).toLocaleDateString('id-ID') : '-'}
                        </TableCell>
                        <TableCell className="font-bold text-zinc-950">{report.title}</TableCell>
                        <TableCell className="text-zinc-600 font-medium">
                          {report.user?.fullName || `Petugas #${report.user?.id ?? '-'}`}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs">
                          {report.lat && report.lng ? (
                            <div className="flex items-center gap-2">
                              <span>{Number(report.lat).toFixed(5)}, {Number(report.lng).toFixed(5)}</span>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${report.lat},${report.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600"
                              >
                                <Map className="w-4 h-4" />
                              </a>
                            </div>
                          ) : report.address || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColor} border-none font-bold text-[10px]`}>
                            {STATUS_LABEL[statusKey] || statusKey}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedReport(report)}
                              className="h-8 w-8 rounded-lg text-zinc-400 hover:text-blue-500 hover:bg-blue-50"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(report.id)}
                              className="h-8 w-8 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Report Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              Detail Laporan Kejadian
            </DialogTitle>
            <DialogDescription>Informasi lengkap laporan dari petugas lapangan.</DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              {/* Photos */}
              {selectedReport.photos && selectedReport.photos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Foto Dokumentasi</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReport.photos.map((photo: any, idx: number) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200">
                        <img
                          src={photo.photoUrl || photo}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(photo.photoUrl || photo, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Judul Laporan</p>
                <p className="font-bold text-lg">{selectedReport.title}</p>
              </div>

              {/* Description */}
              {selectedReport.description && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Deskripsi</p>
                  <p className="text-sm text-zinc-600">{selectedReport.description}</p>
                </div>
              )}

              {/* Reporter Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Petugas Pelapor</p>
                  <p className="font-semibold text-sm">{selectedReport.user?.fullName || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Tanggal Lapor</p>
                  <p className="text-sm text-zinc-600">
                    {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString('id-ID') : '-'}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Lokasi Kejadian</p>
                <p className="text-sm text-zinc-600">{selectedReport.address || '-'}</p>
                {selectedReport.lat && selectedReport.lng && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {Number(selectedReport.lat).toFixed(6)}, {Number(selectedReport.lng).toFixed(6)}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.lat},${selectedReport.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Buka di Google Maps
                    </a>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Status</p>
                <Badge className={`${STATUS_COLOR[selectedReport.status || 'PENDING']} border-none font-bold text-[11px] mt-1`}>
                  {STATUS_LABEL[selectedReport.status || 'PENDING']}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
