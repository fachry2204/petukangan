'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function AdminTasksPage() {
  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Tugas Lapangan</h1>
          <p className="text-zinc-500">Manajemen penugasan dan monitoring progres pekerjaan PPSU.</p>
        </div>
        <Button onClick={() => window.location.href='/admin/tasks/new'} className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl h-11 px-6 shadow-lg shadow-orange-500/20 w-full sm:w-auto">
          + Tugaskan PPSU
        </Button>
      </div>

      {/* Filters Area */}
      <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
          
          {/* Search bar */}
          <div className="flex-1 flex flex-col gap-1 w-full">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Cari Tugas / Petugas</label>
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
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Status Tugas</label>
            <select
              className="rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 px-3 font-medium focus-visible:ring-orange-500 shadow-sm text-zinc-600 dark:text-zinc-300 outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Belum Dikerjakan</option>
              <option value="IN_PROGRESS">Sedang Dikerjakan</option>
              <option value="COMPLETED">Selesai</option>
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

      <Card className="border-none shadow-xl rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl overflow-hidden">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle>Daftar Tugas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-zinc-400">
            Modul Tugas Lapangan sedang dalam tahap pengembangan.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
