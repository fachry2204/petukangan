'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function AdminReportsPage() {
  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

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

          {/* Category Filter */}
          <div className="flex flex-col gap-1 w-full md:w-48">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Kategori Laporan</label>
            <select
              className="rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 px-3 font-medium focus-visible:ring-orange-500 shadow-sm text-zinc-600 dark:text-zinc-300 outline-none"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">Semua Kategori</option>
              <option value="INFRASTRUCTURE">Infrastruktur Rusak</option>
              <option value="FLOOD">Genangan / Banjir</option>
              <option value="TRASH">Tumpukan Sampah</option>
              <option value="TREE">Pohon Tumbang</option>
              <option value="OTHER">Lain-lain</option>
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

          {(search || filterStartDate || filterEndDate || categoryFilter !== 'ALL') && (
            <Button
              variant="ghost"
              onClick={() => { setSearch(''); setFilterStartDate(''); setFilterEndDate(''); setCategoryFilter('ALL'); }}
              className="h-11 px-4 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold rounded-2xl shrink-0"
            >
              Reset
            </Button>
          )}

        </CardContent>
      </Card>

      <Card className="border-none shadow-xl rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl overflow-hidden">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle>Daftar Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-zinc-400">
            Modul Laporan Kejadian sedang dalam tahap pengembangan.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
