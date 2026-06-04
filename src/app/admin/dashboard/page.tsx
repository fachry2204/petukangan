'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  MapPin,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  UserCheck,
  UserX,
  UserMinus,
  FileText,
  MessageSquare,
} from 'lucide-react';

import { useAuthStore } from '@/store/auth-store';
import axios from 'axios';
import { apiUrl } from '@/lib/api-config';

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
    tugasDikerjakan: 0,
    totalLaporan: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);

  const fetchStats = async () => {
    if (!token) return;
    try {
      // Use Promise.all with individual try-catch for each request
      let usersData: any[] = [];
      let tasksData: any[] = [];
      let reportsData: any[] = [];

      try {
        const usersRes = await axios.get(`${apiUrl}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        usersData = usersRes.data || [];
      } catch (e) {
        console.error('Failed to fetch users:', e);
      }

      try {
        const tasksRes = await axios.get(`${apiUrl}/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        tasksData = tasksRes.data || [];
      } catch (e) {
        console.error('Failed to fetch tasks:', e);
      }

      try {
        const reportsRes = await axios.get(`${apiUrl}/reports`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        reportsData = reportsRes.data || [];
      } catch (e) {
        console.error('Failed to fetch reports:', e);
      }

      const ppsuUsers = usersData.filter((u: any) => (u.role?.name || u.roleName) === 'PPSU');
      const activePpsu = ppsuUsers.filter((u: any) => u.status === 'ACTIVE');
      const lakiLaki = ppsuUsers.filter((u: any) => u.gender === 'LAKI-LAKI' || u.gender === 'Laki-Laki' || u.gender === 'Male');
      const perempuan = ppsuUsers.filter((u: any) => u.gender === 'PEREMPUAN' || u.gender === 'Perempuan' || u.gender === 'Female');
      const tidakAktif = ppsuUsers.filter((u: any) => u.status === 'INACTIVE' || u.status === 'TIDAK_AKTIF');
      const dikeluarkan = ppsuUsers.filter((u: any) => u.status === 'TERMINATED' || u.status === 'DIKELUARKAN');
      const tugasDikerjakan = tasksData.filter((t: any) => t.status === 'WORKING' || t.status === 'TODO');
      const totalLaporan = reportsData.length;

      setStats({
        totalPetugas: ppsuUsers.length,
        petugasAktif: activePpsu.length,
        lakiLaki: lakiLaki.length,
        perempuan: perempuan.length,
        tidakAktif: tidakAktif.length,
        dikeluarkan: dikeluarkan.length,
        tugasDikerjakan: tugasDikerjakan.length,
        totalLaporan: totalLaporan,
      });

      const recentActivities: any[] = [];
      
      tasksData.slice(0, 3).forEach((task: any) => {
        let title = '';
        if (task.status === 'WORKING') {
          title = `Tugas Dikerjakan: ${task.assignedTo?.fullName || 'Petugas'}`;
        } else if (task.status === 'DONE') {
          title = `Tugas Selesai: ${task.assignedTo?.fullName || 'Petugas'}`;
        } else {
          title = `Tugas Baru: ${task.title}`;
        }
        recentActivities.push({
          title,
          description: `${task.title} • Sektor Petukangan Utara`,
          time: task.updatedAt ? new Date(task.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'Baru saja'
        });
      });

      ppsuUsers.filter((u: any) => u.lastSeen).slice(0, 2).forEach((u: any) => {
        recentActivities.push({
          title: `Petugas Online: ${u.fullName}`,
          description: `${u.username} • GPS Aktif`,
          time: new Date(u.lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        });
      });

      if (recentActivities.length === 0) {
        recentActivities.push({
          title: 'Sistem Siap',
          description: 'Seluruh sistem monitoring berjalan normal',
          time: 'Baru saja'
        });
      }

      setActivities(recentActivities.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
          { label: 'Total Petugas', value: stats.totalPetugas, icon: Users, color: 'orange', bgClass: 'bg-orange-50 dark:bg-orange-950/20' },
          { label: 'Petugas Aktif', value: stats.petugasAktif, icon: UserCheck, color: 'green', bgClass: 'bg-green-50 dark:bg-green-950/20' },
          { label: 'Laki-Laki', value: stats.lakiLaki, icon: Users, color: 'blue', bgClass: 'bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Perempuan', value: stats.perempuan, icon: Users, color: 'pink', bgClass: 'bg-pink-50 dark:bg-pink-950/20' },
          { label: 'Tidak Aktif', value: stats.tidakAktif, icon: UserMinus, color: 'zinc', bgClass: 'bg-zinc-50 dark:bg-zinc-800' },
          { label: 'Dikeluarkan', value: stats.dikeluarkan, icon: UserX, color: 'red', bgClass: 'bg-red-50 dark:bg-red-950/20' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="animate-in fade-in slide-in-from-bottom-5 duration-500"
            style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
          >
            <Card className={`border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group ${stat.bgClass}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl bg-${stat.color}-500/10 group-hover:bg-${stat.color}-500/20 transition-colors duration-300`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-500 transition-colors duration-300`} />
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

      {/* Stats Overview - Tugas & Laporan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'Total Tugas Dikerjakan', value: stats.tugasDikerjakan, icon: FileText, color: 'blue', bgClass: 'bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Total Laporan Dari Petugas', value: stats.totalLaporan, icon: MessageSquare, color: 'purple', bgClass: 'bg-purple-50 dark:bg-purple-950/20' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="animate-in fade-in slide-in-from-bottom-5 duration-500"
            style={{ animationDelay: `${(idx + 6) * 100}ms`, animationFillMode: 'both' }}
          >
            <Card className={`border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden group ${stat.bgClass}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className={`p-4 rounded-2xl bg-${stat.color}-500/10 group-hover:bg-${stat.color}-500/20 transition-colors duration-300`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-500 transition-colors duration-300`} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold text-green-500`}>
                    <ArrowUpRight className="w-3 h-3" />
                    Live
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

      <div className="grid grid-cols-1 gap-8">
        {/* Activity Feed */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 flex flex-col">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 p-6">
            <CardTitle className="text-lg font-bold">Aktivitas Terkini</CardTitle>
            <p className="text-xs text-zinc-400 mt-0.5">Log aktivitas terintegrasi database</p>
          </CardHeader>
          <CardContent className="p-6 space-y-6 flex-1 overflow-y-auto">
            {activities.map((item, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/10 rounded-xl flex-shrink-0 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                  <p className="text-[10px] text-zinc-400 font-semibold">{item.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
