'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
} from 'lucide-react';

import { useAuthStore } from '@/store/auth-store';
import axios from 'axios';
import { apiUrl } from '@/lib/api-config';
import { useRealtime } from '@/hooks/use-realtime';

export default function AdminDashboardPage() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPetugas: 0,
    petugasAktif: 0,
    lakiLaki: 0,
    perempuan: 0,
    tidakAktif: 0,
    dikeluarkan: 0,
    petugasPiket: 0,
    sudahAbsen: 0,
    belumAbsen: 0,
    izinTidakMasuk: 0,
  });

  const fetchStats = async (signal?: AbortSignal) => {
    if (!token) return;
    try {
      // Use Promise.all with individual try-catch for each request
      let usersData: any[] = [];
      let attendanceStats = { petugasPiket: 0, sudahAbsen: 0, belumAbsen: 0, izinTidakMasuk: 0 };

      try {
        const usersRes = await axios.get(`${apiUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` },
          signal
        });
        usersData = usersRes.data || [];
      } catch (e: any) {
        if (!axios.isCancel(e)) {
          console.error('Failed to fetch users:', e);
        }
      }

      try {
        const attendanceStatsRes = await axios.get(`${apiUrl}/dashboard/attendance-stats`, {
          headers: { Authorization: `Bearer ${token}` },
          signal
        });
        attendanceStats = attendanceStatsRes.data || attendanceStats;
      } catch (e: any) {
        if (!axios.isCancel(e)) {
          console.error('Failed to fetch attendance statistics:', e);
        }
      }

      const pjlpUsers = usersData.filter((u: any) => (u.role?.name || u.roleName) === 'PJLP');
      const activePjlp = pjlpUsers.filter((u: any) => u.status === 'ACTIVE');
      const normalizeGender = (value: unknown) => String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z]/g, '');
      const lakiLaki = pjlpUsers.filter((u: any) => ['LAKILAKI', 'MALE', 'PRIA'].includes(normalizeGender(u.gender)));
      const perempuan = pjlpUsers.filter((u: any) => ['PEREMPUAN', 'FEMALE', 'WANITA'].includes(normalizeGender(u.gender)));
      const tidakAktif = pjlpUsers.filter((u: any) => u.status === 'INACTIVE' || u.status === 'TIDAK_AKTIF');
      const dikeluarkan = pjlpUsers.filter((u: any) => u.status === 'TERMINATED' || u.status === 'DIKELUARKAN');
      setStats({
        totalPetugas: pjlpUsers.length,
        petugasAktif: activePjlp.length,
        lakiLaki: lakiLaki.length,
        perempuan: perempuan.length,
        tidakAktif: tidakAktif.length,
        dikeluarkan: dikeluarkan.length,
        petugasPiket: attendanceStats.petugasPiket,
        sudahAbsen: attendanceStats.sudahAbsen,
        belumAbsen: attendanceStats.belumAbsen,
        izinTidakMasuk: attendanceStats.izinTidakMasuk,
      });

    } catch (error) {
      console.error('Failed to load dashboard statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    if (token) {
      fetchStats(controller.signal);
    }
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Realtime updates for dashboard stats
  useRealtime((event) => {
    if (['user', 'task', 'report', 'attendance'].includes(event.entity)) {
      fetchStats(); // This one doesn't necessarily need a long-lived signal as it's a one-off update
    }
  }, ['user', 'task', 'report', 'attendance']);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-zinc-500 text-sm font-semibold">Memuat data monitoring dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview - Petugas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Petugas', value: stats.totalPetugas, iconSrc: '/icons/dashboard/total-petugas-orange.png', bgClass: 'bg-orange-50 dark:bg-orange-950/20' },
          { label: 'Petugas Aktif', value: stats.petugasAktif, iconSrc: '/icons/dashboard/petugas-aktif-orange.png', bgClass: 'bg-green-50 dark:bg-green-950/20' },
          { label: 'Laki-Laki', value: stats.lakiLaki, iconSrc: '/icons/dashboard/laki-laki-orange.png', bgClass: 'bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Perempuan', value: stats.perempuan, iconSrc: '/icons/dashboard/perempuan-orange.png', bgClass: 'bg-pink-50 dark:bg-pink-950/20' },
          { label: 'Tidak Aktif', value: stats.tidakAktif, iconSrc: '/icons/dashboard/tidak-aktif-orange.png', bgClass: 'bg-zinc-50 dark:bg-zinc-800' },
          { label: 'Dikeluarkan', value: stats.dikeluarkan, iconSrc: '/icons/dashboard/dikeluarkan-orange.png', bgClass: 'bg-red-50 dark:bg-red-950/20' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="animate-in fade-in slide-in-from-bottom-5 duration-500"
            style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
          >
            <Card className={`border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group ${stat.bgClass}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="relative h-14 w-14 transition-transform duration-300 group-hover:scale-110">
                    <Image
                      src={stat.iconSrc}
                      alt={`Ikon ${stat.label}`}
                      fill
                      sizes="56px"
                      className="object-contain drop-shadow-sm"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs font-medium text-zinc-400 mt-1">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Stats Overview - Kehadiran Hari Ini */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'Petugas Piket Hari Ini', value: stats.petugasPiket, iconSrc: '/icons/dashboard/petugas-piket.png', bgClass: 'bg-orange-50 dark:bg-orange-950/20' },
          { label: 'Petugas yang Sudah Absen', value: stats.sudahAbsen, iconSrc: '/icons/dashboard/sudah-absen.png', bgClass: 'bg-green-50 dark:bg-green-950/20' },
          { label: 'Petugas yang Belum Absen', value: stats.belumAbsen, iconSrc: '/icons/dashboard/belum-absen.png', bgClass: 'bg-amber-50 dark:bg-amber-950/20' },
          { label: 'Petugas Izin Tidak Masuk', value: stats.izinTidakMasuk, iconSrc: '/icons/dashboard/izin-tidak-masuk.png', bgClass: 'bg-blue-50 dark:bg-blue-950/20' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="animate-in fade-in slide-in-from-bottom-5 duration-500"
            style={{ animationDelay: `${(idx + 6) * 100}ms`, animationFillMode: 'both' }}
          >
              <Card className={`h-full border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden group ${stat.bgClass}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                  <div className="relative h-16 w-16 transition-transform duration-300 group-hover:scale-110">
                    <Image src={stat.iconSrc} alt={`Ikon ${stat.label}`} fill sizes="64px" className="object-contain drop-shadow-sm" />
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm font-medium text-zinc-400 mt-1">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

    </div>
  );
}
