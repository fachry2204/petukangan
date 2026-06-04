'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Loader2, 
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { apiUrl } from '@/lib/api-config';


export default function PpsuSchedulePage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'this-week' | 'next-week' | 'this-month' | 'next-month'>('this-week');

  const fetchAllSchedules = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter schedules to only show this officer's schedules
      const mySchedules = res.data.filter((s: any) => 
        s.assignedUsers?.some((au: any) => au.id === user.id)
      );
      
      // Sort schedules chronologically ascending (Monday -> Sunday)
      mySchedules.sort((a: any, b: any) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      setSchedules(mySchedules);
    } catch (err) {
      console.error('Failed to fetch schedules list:', err);
    } finally {
      setLoading(false);
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
    fetchAllSchedules();
  }, [token, user, isHydrated]);

  const getIndonesianDayAndDate = (dateStr: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date(dateStr);
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  // Helper ranges for filtration
  const getThisWeekRange = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    
    const start = new Date(now);
    start.setDate(diffToMonday);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  };

  const getNextWeekRange = () => {
    const { start: thisWeekStart } = getThisWeekRange();
    const start = new Date(thisWeekStart);
    start.setDate(thisWeekStart.getDate() + 7);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  };

  const getThisMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const getNextMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const getFilteredSchedules = () => {
    let range: { start: Date, end: Date };
    
    switch (activeFilter) {
      case 'this-week':
        range = getThisWeekRange();
        break;
      case 'next-week':
        range = getNextWeekRange();
        break;
      case 'this-month':
        range = getThisMonthRange();
        break;
      case 'next-month':
        range = getNextMonthRange();
        break;
    }
    
    return schedules.filter((s: any) => {
      const sDate = new Date(s.date);
      return sDate >= range.start && sDate <= range.end;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-zinc-500 text-sm font-semibold">Memuat semua jadwal Anda...</p>
      </div>
    );
  }

  const localTodayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const filteredSchedules = getFilteredSchedules();

  const filters = [
    { id: 'this-week', label: 'Minggu Ini' },
    { id: 'next-week', label: 'Minggu Depan' },
    { id: 'this-month', label: 'Bulan Ini' },
    { id: 'next-month', label: 'Bulan Besok' },
  ];

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push('/ppsu/home')}
          className="h-10 w-10 rounded-xl border-none bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-700 dark:text-white" />
        </Button>
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white">Semua Jadwal Kerja</h2>
          <p className="text-xs text-zinc-500 font-medium">Atur dan lihat jadwal penugasan Anda</p>
        </div>
      </header>

      {/* Filter Horizontal Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filters.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all duration-300 ${
                isActive 
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-95' 
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Table view container */}
      <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden">
        <CardContent className="p-6">
          {filteredSchedules.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <img src="/gambar/icon/calender.png" alt="Jadwal Kosong" className="w-12 h-12 object-contain mx-auto" />
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">
                Tidak ada jadwal kerja untuk periode ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-2">Hari & Tanggal</th>
                    <th className="py-3 px-2">Shift Kerja</th>
                    <th className="py-3 px-2 text-right">Zona Kerja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
                  {filteredSchedules.map((sched: any) => {
                    const schedDateStr = sched.date ? sched.date.split('T')[0] : '';
                    const isToday = schedDateStr === localTodayStr;
                    
                    return (
                      <tr 
                        key={sched.id} 
                        className={`text-xs font-bold transition-colors ${
                          isToday ? 'bg-orange-50/40 dark:bg-orange-950/10' : ''
                        }`}
                      >
                        <td className="py-4 px-2 text-zinc-600 dark:text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            {getIndonesianDayAndDate(sched.date)}
                            {isToday && (
                              <Badge className="bg-orange-500 text-white border-none font-bold text-[8px] px-1.5 py-0 rounded">
                                Hari Ini
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="space-y-0.5">
                            <Badge className="bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-none font-black text-[9px] px-2 py-0.5">
                              {sched.shiftName}
                            </Badge>
                            <span className="block text-[9px] text-zinc-400 font-medium">
                              ({sched.timeRange?.split(' - ')[0] || sched.startTime || '08:00'} WIB)
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right text-zinc-800 dark:text-zinc-200">
                          <span className="font-black">
                            {typeof sched.zone === 'object' ? sched.zone?.name : sched.zone}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
