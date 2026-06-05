'use client';

import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { MapPin, Globe, Clock, LogOut, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';

export default function OnlineOfficersPage() {
  const [officers, setOfficers] = useState<any[]>([]);
  const { token } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '/';
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('joinAdminRoom');
    });

    newSocket.on('userOnline', (data) => {
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

    newSocket.on('locationUpdated', (data) => {
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

    newSocket.on('activeLocationsSync', (activeList) => {
      setOfficers(prev => {
        const newOfficers = [...prev];
        activeList.forEach((active: any) => {
          const existingIdx = newOfficers.findIndex(o => o.userId === active.userId);
          if (existingIdx > -1) {
            newOfficers[existingIdx] = { ...newOfficers[existingIdx], ...active };
          } else {
            newOfficers.push(active);
          }
        });
        return newOfficers;
      });
    });

    newSocket.on('userOffline', (data) => {
      setOfficers(prev => prev.filter(o => o.userId !== data.userId));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const handleForceLogout = (userId: number, name: string) => {
    if (confirm(`Apakah Anda yakin ingin melakukan Force Logout pada petugas ${name || 'ini'}?`)) {
      if (socket) {
        socket.emit('forceLogoutUser', { userId });
      }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Data Petugas Online</h1>
          <p className="text-zinc-500 font-medium mt-1 text-sm">Daftar petugas PPSU yang sedang aktif dan terhubung dengan sistem tracking GPS saat ini.</p>
        </div>
        <Badge className="bg-green-500 hover:bg-green-600 text-white border-none font-bold px-4 py-2 text-sm flex items-center gap-2 rounded-xl shadow-[0_4px_15px_rgba(34,197,94,0.3)]">
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
          {officers.length} Online
        </Badge>
      </div>

              {/* Table view for online officers */}
        {officers.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/50 dark:bg-zinc-900/50">
            <Loader2 className="w-12 h-12 text-zinc-300 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-zinc-600">Menunggu Koneksi Petugas...</h3>
            <p className="text-sm text-zinc-400 text-center max-w-md mt-2 font-medium">
              Belum ada satupun petugas yang membuka aplikasi dan memancarkan sinyal GPS pada saat ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Foto</th>
                  <th className="px-4 py-2">Nama</th>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">GPS</th>
                  <th className="px-4 py-2">Lokasi</th>
                  <th className="px-4 py-2">IP</th>
                  <th className="px-4 py-2">Device</th>
                  <th className="px-4 py-2">Update</th>
                  <th className="px-4 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {officers.map((officer, idx) => (
                  <tr key={officer.userId} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <td className="px-4 py-2">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <img
                        src={officer.photoUrl || '/logodki.png'}
                        alt={officer.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                      />
                    </td>
                    <td className="px-4 py-2">{officer.fullName || `Petugas ${officer.userId}`}</td>
                    <td className="px-4 py-2">{officer.userId}</td>
                    <td className="px-4 py-2">
                      <Badge className={`${officer.gpsStatus ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {officer.gpsStatus ? 'GPS AKTIF' : 'TIDAK AKTIF'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      {officer.lat && officer.lng ? `${officer.lat.toFixed(4)}, ${officer.lng.toFixed(4)}` : '-'}
                    </td>
                    <td className="px-4 py-2">{officer.ipAddress || '-'}</td>
                    <td className="px-4 py-2">{officer.device || '-'}</td>
                    <td className="px-4 py-2">
                      {officer.timestamp ? new Date(officer.timestamp).toLocaleTimeString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <Button
                        onClick={() => handleForceLogout(officer.userId, officer.fullName)}
                        variant="destructive"
                        className="h-8 px-2 text-xs"
                      >
                        Logout
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        

    </div>
  );
}
