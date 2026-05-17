'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MapPin, 
  ClipboardCheck, 
  AlertTriangle, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Activity
} from 'lucide-react';

import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import axios from 'axios';

// Dynamic import for Leaflet (No SSR)
const MapComponent = dynamic(() => import('@/components/map-component'), { ssr: false });

export default function AdminDashboardPage() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPetugas: 0,
    petugasAktif: 0,
    tugasSelesai: 0,
    laporanPending: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);

  // 1. Fetch Stats from DB
  const fetchStats = async () => {
    if (!token) return;
    try {
      const [usersRes, tasksRes, reportsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/reports`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const ppsuUsers = usersRes.data.filter((u: any) => (u.role?.name || u.roleName) === 'PPSU');
      const activePpsu = ppsuUsers.filter((u: any) => u.status === 'ACTIVE');
      const completedTasks = tasksRes.data.filter((t: any) => t.status === 'DONE' || t.status === 'SELESAI');
      const pendingReports = reportsRes.data.filter((r: any) => r.status === 'PENDING');

      setStats({
        totalPetugas: ppsuUsers.length,
        petugasAktif: activePpsu.length,
        tugasSelesai: completedTasks.length,
        laporanPending: pendingReports.length
      });

      // Populate dynamic activities
      const recentActivities: any[] = [];
      
      // Tasks activities
      tasksRes.data.slice(0, 3).forEach((task: any) => {
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

      // Online users
      ppsuUsers.filter((u: any) => u.lastSeen).slice(0, 2).forEach((u: any) => {
        recentActivities.push({
          title: `Petugas Online: ${u.fullName}`,
          description: `${u.username} • GPS Aktif`,
          time: new Date(u.lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        });
      });

      // Fallback activities if none
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

      // 2. Setup Realtime Map Tracking Socket
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
        auth: { token }
      });

      socket.on('connect', () => {
        socket.emit('joinAdminRoom');
      });

      socket.on('locationUpdated', (data) => {
        setOfficers(prev => {
          const existing = prev.findIndex(o => o.userId === data.userId);
          if (existing > -1) {
            const updated = [...prev];
            updated[existing] = { ...updated[existing], ...data };
            return updated;
          }
          return [...prev, data];
        });
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [token]);

  const mapPoints = officers.map(o => ({
    lat: o.lat,
    lng: o.lng,
    name: `Petugas ID: ${o.userId}`,
    status: 'Online'
  }));

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
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Petugas', value: stats.totalPetugas, icon: Users, color: 'orange', trend: '+10%', up: true },
          { label: 'Petugas Aktif', value: stats.petugasAktif, icon: MapPin, color: 'green', trend: '+5%', up: true },
          { label: 'Tugas Selesai', value: stats.tugasSelesai, icon: ClipboardCheck, color: 'blue', trend: '+15%', up: true },
          { label: 'Laporan Pending', value: stats.laporanPending, icon: AlertTriangle, color: 'red', trend: '0%', up: false },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="animate-in fade-in slide-in-from-bottom-5 duration-500"
            style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
          >
            <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden group bg-white dark:bg-zinc-900">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className={`p-4 rounded-2xl bg-${stat.color}-500/10 group-hover:bg-${stat.color}-500 transition-colors duration-300`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-500 group-hover:text-white transition-colors duration-300`} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold ${stat.up ? 'text-green-500' : 'text-zinc-400'}`}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3" /> : null}
                    {stat.trend}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Realtime Tracking Monitor */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden min-h-[450px] flex flex-col bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 p-6 shrink-0">
            <div>
              <CardTitle className="text-lg font-bold">Live GPS Map Monitoring</CardTitle>
              <p className="text-xs text-zinc-400 mt-0.5">Lokasi real-time petugas lapangan PPSU</p>
            </div>
            <Badge className="bg-green-500 hover:bg-green-600 text-white border-none font-bold px-3 py-1 text-xs flex items-center gap-1 shrink-0">
              <Activity className="w-3 h-3 animate-pulse" /> LIVE
            </Badge>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative min-h-[300px]">
            <MapComponent points={mapPoints} />
          </CardContent>
        </Card>

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
