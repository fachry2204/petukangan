'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Check, Loader2, Search, X, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/auth-store';


const MapComponent = dynamic(() => import('@/components/map-component'), { ssr: false });

export default function NewTaskPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<[number, number] | null>(null);
  
  const [officers, setOfficers] = useState<any[]>([]);
  const [onlineOfficers, setOnlineOfficers] = useState<any[]>([]);
  const [selectedOfficers, setSelectedOfficers] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'online' | 'offline'>('online');
  const [officerSearch, setOfficerSearch] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  
  const onlineStaff = officers.filter(o => onlineOfficers.some(onl => onl.userId === o.id));
  const offlineStaff = officers.filter(o => !onlineOfficers.some(onl => onl.userId === o.id));
  const baseStaff = activeTab === 'online' ? onlineStaff : offlineStaff;
  const displayedStaff = officerSearch.trim()
    ? baseStaff.filter(o => (o.fullName || '').toLowerCase().includes(officerSearch.toLowerCase()))
    : baseStaff;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch all PPSU staff
    const fetchStaff = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter out admins if any, assuming role is PPSU
          setOfficers(data.filter((u: any) => u.role?.name === 'PPSU' || u.role === 'PPSU'));
        }
      } catch (err) {
        console.error('Failed to fetch staff', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaff();

    // Fetch active officers from REST API as fallback/initial data
    const fetchActiveOfficers = async () => {
      try {
        const res = await fetch('/api/tracking/active-officers?minutes=60', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.officers && data.officers.length > 0) {
            setOnlineOfficers(data.officers.map((o: any) => ({
              userId: o.userId,
              fullName: o.fullName,
              photoUrl: o.photoUrl,
              lat: o.lat,
              lng: o.lng,
              status: o.statusAbsen || 'Online',
            })));
          }
        }
      } catch (err) {
        console.error('Failed to fetch active officers:', err);
      }
    };
    fetchActiveOfficers();

    // Listen to active socket locations to mark online status
    let socket: any;
    const setupSocket = async () => {
      const ioModule = await import('socket.io-client');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `${protocol}//${window.location.hostname}:3001`;
      socket = ioModule.io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('[TaskNew] Socket connected');
        socket.emit('joinAdminRoom');
      });

      socket.on('activeLocationsSync', (data: any[]) => {
        console.log('[TaskNew] activeLocationsSync received:', data);
        setOnlineOfficers(data);
      });

      socket.on('locationUpdated', (data: any) => {
        setOnlineOfficers(prev => {
          const existing = prev.findIndex(o => o.userId === data.userId);
          if (existing > -1) {
            const updated = [...prev];
            updated[existing] = { ...updated[existing], ...data };
            return updated;
          }
          return [...prev, data];
        });
      });

      socket.on('userOffline', (data: { userId: number }) => {
        setOnlineOfficers(prev => prev.filter(o => o.userId !== data.userId));
      });
    };
    setupSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [token]);

  const toggleOfficerSelection = (id: number) => {
    setSelectedOfficers(prev => 
      prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
    );
  };

  const handleMapClick = (lat: number, lng: number) => {
    setLocation([lat, lng]);
  };

  const handleSubmit = async () => {
    if (!title || !description || selectedOfficers.length === 0 || !location) {
      alert('Harap lengkapi semua data: Judul, Deskripsi, Titik Lokasi, dan minimal 1 Petugas.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          lat: location[0],
          lng: location[1],
          deadline: deadline || null,
          priority,
          taskType: 'ASSIGNED',
          assignedToId: selectedOfficers[0],
          officerIds: selectedOfficers
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Terjadi kesalahan');
      }

      alert('Tugas lapangan berhasil ditugaskan!');
      router.push('/admin/tasks');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal membuat tugas baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapPoints = location ? [{
    id: 'target-location',
    lat: location[0],
    lng: location[1],
    name: 'Lokasi Tugas',
    status: 'Target',
    isSOS: false
  }] : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/admin/tasks')} className="w-10 h-10 p-0 rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
          <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Tugas Baru Lapangan</h1>
          <p className="text-zinc-500">Buat penugasan baru dan pilih lokasi serta petugas terkait.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Officer Selection (Moved to top) */}
        <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden">
          <CardHeader className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-zinc-800 dark:text-zinc-200 text-lg">Pilih Petugas</CardTitle>
                <p className="text-xs text-zinc-500 mt-1">Pilih satu atau lebih petugas untuk tugas ini.</p>
              </div>
              <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setActiveTab('online')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'online' ? 'bg-white dark:bg-zinc-700 shadow-sm text-green-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Online
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'online' ? 'bg-green-100 text-green-700' : 'bg-zinc-300 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300'}`}>{onlineStaff.length}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('offline')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'offline' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-800 dark:text-white' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  Offline
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'offline' ? 'bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200' : 'bg-zinc-300 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300'}`}>{offlineStaff.length}</span>
                </button>
              </div>
            </div>
          </CardHeader>
          {/* Smart Search Bar */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder={`Cari nama petugas ${activeTab}...`}
                value={officerSearch}
                onChange={e => setOfficerSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
              />
              {officerSearch && (
                <button
                  type="button"
                  onClick={() => setOfficerSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center hover:bg-zinc-400 transition-colors"
                >
                  <X className="w-3 h-3 text-zinc-600 dark:text-zinc-200" />
                </button>
              )}
            </div>
          </div>
          <CardContent className="p-0 max-h-[350px] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
            ) : displayedStaff.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-zinc-400 text-sm font-medium">
                  {officerSearch ? `Tidak ada petugas yang cocok dengan "${officerSearch}"` : `Tidak ada petugas ${activeTab} saat ini.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:border-b border-zinc-100 dark:border-zinc-800/50">
                {displayedStaff.map(officer => {
                  const isOnline = activeTab === 'online';
                  const isSelected = selectedOfficers.includes(officer.id);
                  
                  return (
                    <div 
                      key={officer.id}
                      onClick={() => toggleOfficerSelection(officer.id)}
                      className={`flex items-center gap-3 p-4 border-b md:border-r md:border-b border-zinc-100 dark:border-zinc-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-orange-50/50 dark:bg-orange-950/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="relative shrink-0">
                        {officer.photoUrl ? (
                          <img src={officer.photoUrl} alt={officer.fullName} className="w-10 h-10 rounded-full object-cover border border-zinc-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                            {officer.fullName?.charAt(0) || 'P'}
                          </div>
                        )}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${isOnline ? 'bg-green-500' : 'bg-zinc-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{officer.fullName}</p>
                        <p className="text-xs text-zinc-500 truncate">{isOnline ? 'Online (Aktif)' : 'Offline'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Total Terpilih:</span>
            <span className="text-xl font-black text-orange-600">{selectedOfficers.length}</span>
          </div>
        </Card>

        {/* Form Details */}
        <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden">
          <CardHeader className="bg-orange-50 dark:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900/30">
            <CardTitle className="text-orange-700 dark:text-orange-400 text-lg">Informasi Tugas</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Judul Tugas</label>
              <Input 
                placeholder="Contoh: Pembersihan Saluran Air Mampet" 
                className="h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-orange-500"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Tanggal Tugas
                </label>
                <Input 
                  type="date"
                  className="h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-orange-500 text-zinc-700 dark:text-zinc-300"
                  value={deadline}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Prioritas</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                >
                  <option value="LOW">🟢 Rendah</option>
                  <option value="MEDIUM">🟡 Sedang</option>
                  <option value="HIGH">🔴 Tinggi</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Deskripsi Pekerjaan</label>
              <Textarea 
                placeholder="Jelaskan detail pekerjaan yang harus diselesaikan..." 
                className="min-h-[120px] rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-orange-500 resize-none p-4"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="border-none shadow-sm rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden">
          <CardHeader className="bg-blue-50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex flex-row items-center justify-between">
            <CardTitle className="text-blue-700 dark:text-blue-400 text-lg">Titik Lokasi (Map)</CardTitle>
            {location && (
              <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-md">
                Koordinat Tersimpan
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0 relative h-[400px] bg-zinc-100">
            <MapComponent 
              points={mapPoints} 
              center={location || [-6.2312, 106.7718]} 
              zoom={location ? 16 : 14} 
              onMapClick={handleMapClick}
            />
            {!location && (
              <div className="absolute inset-0 z-[400] pointer-events-none flex items-center justify-center">
                <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 shadow-xl">
                  <MapPin className="w-4 h-4 animate-bounce" /> Klik pada peta untuk memilih lokasi tugas
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black rounded-3xl h-16 text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
        >
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'KIRIM PENUGASAN'}
        </Button>
      </div>
    </div>
  );
}
