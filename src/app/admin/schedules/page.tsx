'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import axios from 'axios';
import { apiUrl } from '@/lib/api-config';
import { 
  Plus, Search, Filter, Clock, MapPin, Users, Calendar as CalendarIcon, 
  Trash2, X, AlertCircle, RefreshCw, CheckCircle2, Eye, Edit2 
} from 'lucide-react';

interface StaffUser {
  id: number;
  username: string;
  fullName: string;
  photoUrl: string;
  status?: string;
  role: {
    name: string;
  };
}

interface ScheduleItem {
  id: number;
  shiftName: string;
  timeRange: string;
  zone: string;
  date: string;
  assignedUsers: {
    id: number;
    username: string;
    fullName: string;
    photoUrl: string;
  }[];
  status: string;
}

export default function AdminSchedulesPage() {
  const router = useRouter();
  const settings = useSettingsStore();
  const { token, logout } = useAuthStore();

  // State Management
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Filtering States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterShift, setFilterShift] = useState('');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState<ScheduleItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);

  // Form State
  const [selectedShiftIdx, setSelectedShiftIdx] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any[]>([]);
  
  // Staff Selection Search State
  const [staffSearch, setStaffSearch] = useState('');
  const [allStaff, setAllStaff] = useState<StaffUser[]>([]);

  // Fetch Schedules and Staff on Mount
  useEffect(() => {
    // Check if there is a saved token in localStorage to prevent early logout during hydration
    const savedAuthStr = typeof window !== 'undefined' ? localStorage.getItem('ppsu-auth-storage') : null;
    let hasSavedToken = false;
    if (savedAuthStr) {
      try {
        const savedAuth = JSON.parse(savedAuthStr);
        if (savedAuth?.state?.token) {
          hasSavedToken = true;
        }
      } catch (e) {
        console.error('Failed to parse saved auth storage:', e);
      }
    }

    if (!token && !hasSavedToken) {
      logout();
      router.push('/login');
      return;
    }

    if (token) {
      fetchSchedules();
      fetchStaff();
      // Jika settings.zones masih kosong (belum di-load oleh SettingsProvider),
      // fetch langsung dari backend agar dropdown zona tersedia
      if (!settings.zones || settings.zones.length === 0) {
        axios.get(`${apiUrl}/settings`)
          .then(res => {
            if (res.data.zones) settings.setSettings({ zones: res.data.zones });
            if (res.data.shifts) settings.setSettings({ shifts: res.data.shifts });
          })
          .catch(err => console.error('Failed to load settings for schedules page:', err));
      }
    }
  }, [token]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(res.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load schedules:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        router.push('/login');
      } else {
        setError('Gagal memuat daftar jadwal.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out admin users, keep only PPSU/staff users who are active
      const staffUsers = res.data.filter((u: any) => {
        const roleName = u.roleName || (typeof u.role === 'string' ? u.role : u.role?.name);
        const isPPSUorStaff = roleName === 'PPSU' || roleName === 'STAFF';

        // Check if user status is active (default is ACTIVE)
        const userStatus = String(u.status || 'ACTIVE').toUpperCase();
        const isActuallyActive = userStatus === 'ACTIVE' || userStatus === 'AKTIF';

        return isPPSUorStaff && isActuallyActive;
      });
      setAllStaff(staffUsers);
    } catch (err: any) {
      console.error('Failed to load staff list:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        router.push('/login');
      }
    }
  };

  // Helper to format date in DD/MM/YYYY format
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper to determine real-time dynamic status of a schedule
  const getDynamicStatus = (dateStr: string, timeRange: string) => {
    if (!dateStr || !timeRange) return 'Mendatang';
    try {
      const now = new Date();
      // sDate is YYYY-MM-DD
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      
      const [startStr, endStr] = timeRange.split(' - ');
      const [sHours, sMins] = startStr.split(':').map(Number);
      const [eHours, eMins] = endStr.split(':').map(Number);
      
      const startDateTime = new Date(year, month - 1, day, sHours, sMins, 0, 0);
      const endDateTime = new Date(year, month - 1, day, eHours, eMins, 0, 0);
      
      // If night shift (e.g. 22:00 - 06:00), end date is next day
      if (eHours < sHours) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }
      
      if (now < startDateTime) {
        return 'Mendatang';
      } else if (now >= startDateTime && now <= endDateTime) {
        return 'Berjalan';
      } else {
        return 'Selesai';
      }
    } catch (e) {
      return 'Berjalan';
    }
  };

  // Helper to calculate end time (assuming 8 hours shift)
  const getShiftTimeRange = (startTime: string) => {
    if (!startTime) return '08:00 - 16:00';
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = (hours + 8) % 24;
    const endHoursStr = String(endHours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    return `${startTime} - ${endHoursStr}:${minutesStr}`;
  };

  // Add staff member to selected list
  const handleAddStaff = (staff: StaffUser) => {
    if (selectedStaff.some(s => s.id === staff.id)) return;
    setSelectedStaff([...selectedStaff, staff]);
    setStaffSearch(''); // Reset search text
  };

  // Remove staff member from selected list
  const handleRemoveStaff = (staffId: number) => {
    setSelectedStaff(selectedStaff.filter(s => s.id !== staffId));
  };

  // Trigger to open modal in create mode
  const handleAddClick = () => {
    setEditingScheduleId(null);
    setSelectedShiftIdx('');
    setSelectedZone('');
    setTaskDate('');
    setSelectedStaff([]);
    setIsAddModalOpen(true);
  };

  // Trigger to open modal in edit mode with pre-filled details
  const handleEditClick = (schedule: ScheduleItem) => {
    setEditingScheduleId(schedule.id);
    
    let shiftIdx = '';
    if (settings.shifts) {
      const foundIdx = settings.shifts.findIndex((shift: any) => {
        const shiftName = typeof shift === 'object' && shift !== null ? shift.name : shift;
        return shiftName === schedule.shiftName;
      });
      if (foundIdx !== -1) {
        shiftIdx = String(foundIdx);
      }
    }
    setSelectedShiftIdx(shiftIdx);
    setSelectedZone(schedule.zone);
    
    const datePart = schedule.date ? schedule.date.split('T')[0] : '';
    setTaskDate(datePart);
    setSelectedStaff(schedule.assignedUsers || []);
    setIsAddModalOpen(true);
  };

  // Trigger to open modal in read-only view mode
  const handleViewClick = (schedule: ScheduleItem) => {
    setViewingSchedule(schedule);
    setIsViewModalOpen(true);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterZone('');
    setFilterShift('');
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftIdx) {
      alert('Silakan pilih shift terlebih dahulu!');
      return;
    }
    if (!selectedZone) {
      alert('Silakan pilih zona terlebih dahulu!');
      return;
    }
    if (!taskDate) {
      alert('Silakan isi tanggal tugas!');
      return;
    }
    if (selectedStaff.length === 0) {
      alert('Silakan pilih minimal satu petugas!');
      return;
    }

    try {
      setSubmitting(true);
      const shiftObj = settings.shifts[parseInt(selectedShiftIdx, 10)];
      const isObj = typeof shiftObj === 'object' && shiftObj !== null;
      const shiftName = isObj ? shiftObj.name : shiftObj;
      const startTime = isObj ? shiftObj.startTime : '08:00';
      const endTime = isObj && shiftObj.endTime ? shiftObj.endTime : getShiftTimeRange(startTime).split(' - ')[1];
      const timeRange = `${startTime} - ${endTime}`;

      // Determine status based on selected date and shift time range
      let status = 'Mendatang';
      try {
        const now = new Date();
        const [year, month, day] = taskDate.split('-').map(Number);
        const [startStr, endStr] = timeRange.split(' - ');
        const [sHours, sMins] = startStr.split(':').map(Number);
        const [eHours, eMins] = endStr.split(':').map(Number);

        const startDateTime = new Date(year, month - 1, day, sHours, sMins, 0, 0);
        const endDateTime = new Date(year, month - 1, day, eHours, eMins, 0, 0);

        if (eHours < sHours) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        if (now < startDateTime) {
          status = 'Mendatang';
        } else if (now >= startDateTime && now <= endDateTime) {
          status = 'Berjalan';
        } else {
          status = 'Selesai';
        }
      } catch (e) {
        console.error('Error calculating status payload:', e);
      }

      const payload = {
        shiftName,
        timeRange,
        zone: selectedZone,
        date: taskDate,
        assignedUsers: selectedStaff.map(s => ({
          id: s.id,
          username: s.username,
          fullName: s.fullName,
          photoUrl: s.photoUrl
        })),
        status
      };

      if (editingScheduleId !== null) {
        await axios.put(`${apiUrl}/schedules/${editingScheduleId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${apiUrl}/schedules`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      // Reset Form and Refresh List
      setIsAddModalOpen(false);
      setEditingScheduleId(null);
      setSelectedShiftIdx('');
      setSelectedZone('');
      setTaskDate('');
      setSelectedStaff([]);
      fetchSchedules();
    } catch (err: any) {
      console.error('Failed to save schedule:', err);
      alert('Gagal menyimpan jadwal petugas.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Schedule
  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal petugas ini?')) return;
    try {
      await axios.delete(`${apiUrl}/schedules/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSchedules();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      alert('Gagal menghapus jadwal.');
    }
  };

  // Filter staff members based on search (ID or Name) and exclude already selected ones
  const filteredStaff = allStaff.filter(staff => {
    // 1. Exclude if already selected in the current modal form
    const isSelected = selectedStaff.some(s => s.id === staff.id);
    if (isSelected) return false;

    // 2. Exclude if already has a schedule in the database on this specific date
    if (taskDate) {
      const getShortDate = (dStr: string) => dStr ? dStr.split('T')[0] : '';
      const hasScheduleOnDate = schedules.some(s => {
        const sDate = getShortDate(s.date);
        const tDate = getShortDate(taskDate);
        const hasUser = s.assignedUsers?.some(u => u.id === staff.id);
        return sDate === tDate && hasUser;
      });
      if (hasScheduleOnDate) return false;
    }

    // 3. Keep ONLY active staff members
    const statusUpper = String(staff.status || 'ACTIVE').toUpperCase();
    const isActuallyActive = statusUpper === 'ACTIVE' || statusUpper === 'AKTIF';
    if (!isActuallyActive) return false;

    const searchLower = staffSearch.toLowerCase();
    return (
      staff.fullName.toLowerCase().includes(searchLower) ||
      staff.username.toLowerCase().includes(searchLower)
    );
  });

  // Filter schedules list based on search bar and dropdown filters
  const filteredSchedules = schedules.filter(s => {
    // 1. Search Query Match
    const query = search.toLowerCase();
    const matchesQuery = !search || (
      s.shiftName.toLowerCase().includes(query) ||
      s.zone.toLowerCase().includes(query) ||
      s.assignedUsers.some(user => user.fullName.toLowerCase().includes(query))
    );

    // 2. Date Range Match
    const getShortDate = (dStr: string) => dStr ? dStr.split('T')[0] : '';
    const sDateStr = getShortDate(s.date);
    const matchesStartDate = !filterStartDate || sDateStr >= filterStartDate;
    const matchesEndDate = !filterEndDate || sDateStr <= filterEndDate;
    const matchesDate = matchesStartDate && matchesEndDate;

    // 3. Zone Filter Match
    const matchesZone = !filterZone || s.zone === filterZone;

    // 4. Shift Filter Match
    const matchesShift = !filterShift || s.shiftName === filterShift;

    return matchesQuery && matchesDate && matchesZone && matchesShift;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">Jadwal Petugas PPSU</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Manajemen shift dinamis dan pembagian wilayah penugasan kerja lapangan</p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-12 px-6 shadow-md transition-all font-bold hover:shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" /> Tambah Jadwal
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/50">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <Button variant="ghost" onClick={fetchSchedules} className="ml-auto text-red-500 hover:bg-red-100/50 p-1 h-auto rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Card className="border-none shadow-xl rounded-3xl bg-white dark:bg-zinc-900 overflow-hidden">
        <CardHeader className="flex flex-col gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-800/10 p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full items-end">
            {/* Search Input */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Cari Petugas</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  placeholder="Cari nama petugas..." 
                  className="pl-11 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 font-medium focus-visible:ring-orange-500 shadow-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Start Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Mulai Tanggal</label>
              <Input 
                type="date"
                className="rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 font-medium focus-visible:ring-orange-500 shadow-sm text-zinc-650 dark:text-zinc-300"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                title="Mulai Tanggal"
              />
            </div>

            {/* Filter End Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Sampai Tanggal</label>
              <Input 
                type="date"
                className="rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 h-11 font-medium focus-visible:ring-orange-500 shadow-sm text-zinc-650 dark:text-zinc-300"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                title="Sampai Tanggal"
              />
            </div>

            {/* Filter Zone */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Zona Kerja</label>
              <select
                value={filterZone}
                onChange={e => setFilterZone(e.target.value)}
                className="flex h-11 w-full rounded-2xl border border-zinc-150 dark:border-zinc-750 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 text-zinc-650 dark:text-zinc-300 font-medium shadow-sm"
              >
                <option value="">Semua Zona Kerja</option>
                {settings.zones?.map((zone: string, idx) => (
                  <option key={idx} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Shift */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider pl-1">Shift Kerja</label>
              <div className="flex items-center gap-2">
                <select
                  value={filterShift}
                  onChange={e => setFilterShift(e.target.value)}
                  className="flex h-11 flex-1 rounded-2xl border border-zinc-150 dark:border-zinc-750 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 text-zinc-650 dark:text-zinc-300 font-medium shadow-sm"
                >
                  <option value="">Semua Shift Kerja</option>
                  {settings.shifts?.map((shift: any, idx) => {
                    const shiftName = typeof shift === 'object' && shift !== null ? shift.name : shift;
                    return (
                      <option key={idx} value={shiftName}>
                        {shiftName}
                      </option>
                    );
                  })}
                </select>

                {/* Reset Button */}
                {(search || filterStartDate || filterEndDate || filterZone || filterShift) && (
                  <Button 
                    variant="ghost" 
                    onClick={handleResetFilters}
                    className="rounded-2xl h-11 px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold shrink-0 transition-colors"
                    title="Reset Filter"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-zinc-500 text-sm font-semibold">Memuat data jadwal...</p>
            </div>
          ) : filteredSchedules.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                    <TableHead className="font-bold text-zinc-700 dark:text-zinc-300 px-6 py-4">Shift</TableHead>
                    <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Tanggal</TableHead>
                    <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Waktu Tugas</TableHead>
                    <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Zona Kerja</TableHead>
                    <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Daftar Petugas</TableHead>
                    <TableHead className="font-bold text-zinc-700 dark:text-zinc-300">Status</TableHead>
                    <TableHead className="font-bold text-zinc-700 dark:text-zinc-300 text-right px-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule) => (
                    <TableRow key={schedule.id} className="border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black">
                            <Clock className="w-4 h-4" />
                          </div>
                          <span className="font-black text-zinc-800 dark:text-zinc-200">{schedule.shiftName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 font-semibold">
                          <CalendarIcon className="w-4 h-4 text-zinc-400" />
                          {formatDate(schedule.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 font-semibold">
                          <Clock className="w-4 h-4 text-zinc-400" />
                          {schedule.timeRange}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 font-bold">
                          <MapPin className="w-4 h-4 text-zinc-400" />
                          {schedule.zone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2.5 overflow-hidden">
                            {schedule.assignedUsers && schedule.assignedUsers.slice(0, 3).map((user, idx) => (
                              <img
                                key={idx}
                                className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-900 object-cover shadow-sm"
                                src={user.photoUrl || '/logodki.png'}
                                alt={user.fullName}
                                title={`${user.fullName} (${user.username})`}
                                onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                              />
                            ))}
                            {schedule.assignedUsers && schedule.assignedUsers.length > 3 && (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 ring-2 ring-white dark:ring-zinc-900 text-xs font-black text-zinc-600 dark:text-zinc-400 shadow-sm">
                                +{schedule.assignedUsers.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-bold text-zinc-500 ml-1">
                            {schedule.assignedUsers?.length || 0} Orang
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const currentStatus = getDynamicStatus(schedule.date, schedule.timeRange);
                          return (
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                              currentStatus === 'Berjalan' 
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                : currentStatus === 'Selesai'
                                ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                            }`}>
                              {currentStatus}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            onClick={() => handleViewClick(schedule)}
                            className="text-zinc-500 hover:text-zinc-650 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl w-9 h-9 p-0"
                            title="Detail Jadwal"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={() => handleEditClick(schedule)}
                            className="text-orange-500 hover:text-orange-650 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-xl w-9 h-9 p-0"
                            title="Edit Jadwal"
                          >
                            <Edit2 className="w-4.5 h-4.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={() => handleDelete(schedule.id)}
                            className="text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl w-9 h-9 p-0"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center p-6">
              <CalendarIcon className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Belum Ada Jadwal Petugas</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mt-1 mb-6">
                Belum ada jadwal yang dikonfigurasi saat ini. Klik tombol tambah untuk menjadwalkan shift petugas lapangan.
              </p>
              <Button 
                onClick={handleAddClick}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-11 px-5 shadow-md font-bold"
              >
                <Plus className="w-4 h-4 mr-2" /> Tambah Jadwal Pertama
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Centered Add Modal Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-zinc-950 dark:text-white">
                  {editingScheduleId !== null ? 'Edit Jadwal Petugas' : 'Tambah Jadwal Petugas'}
                </h3>
                <p className="text-xs text-zinc-500">Tentukan tanggal, wilayah kerja, shift, dan daftar petugas PPSU</p>
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditingScheduleId(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Schedule Metadata (5 cols) */}
                <div className="lg:col-span-5 space-y-5">
                  
                  {/* Tanggal Tugas (Format DD/MM/YYYY) */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                      <span>Tanggal Tugas (Format: DD/MM/YYYY)</span>
                      {taskDate && (
                        <span className="text-xs font-black text-orange-500 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded border border-orange-100/50">
                          Tampil: {formatDate(taskDate)}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Input 
                        type="date" 
                        value={taskDate}
                        onChange={(e) => setTaskDate(e.target.value)}
                        className="rounded-2xl h-11 border-zinc-200 focus-visible:ring-orange-500 font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* Shift Dropdown */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Shift Petugas</label>
                    <select
                      value={selectedShiftIdx}
                      onChange={(e) => setSelectedShiftIdx(e.target.value)}
                      className="flex h-11 w-full rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-medium"
                      required
                    >
                      <option value="">-- Pilih Shift Kerja --</option>
                      {settings.shifts?.map((shift: any, idx) => {
                        const isObject = typeof shift === 'object' && shift !== null;
                        const shiftName = isObject ? shift.name : shift;
                        const shiftStartTime = isObject ? shift.startTime : '08:00';
                        const shiftEndTime = isObject && shift.endTime ? shift.endTime : '--:--';
                        return (
                          <option key={idx} value={idx}>
                            {shiftName} ({shiftStartTime} - {shiftEndTime})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Zona Dropdown */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Zona Petugas</label>
                    <select
                      value={selectedZone}
                      onChange={(e) => setSelectedZone(e.target.value)}
                      className="flex h-11 w-full rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-medium"
                      required
                    >
                      <option value="">-- Pilih Zona Tugas --</option>
                      {settings.zones?.map((zone: string, idx) => (
                        <option key={idx} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right Column: Smart search and Added Staff Card Grid (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Petugas Smart Search Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Cari & Tambah Petugas PPSU (Bisa Lebih Dari Satu)</label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        type="text"
                        placeholder="Ketik NIK atau Nama petugas..."
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        className="pl-11 rounded-2xl h-11 border-zinc-200 focus-visible:ring-orange-500"
                      />
                      
                      {/* Dynamic Floating Search Results */}
                      {staffSearch.trim() !== '' && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl shadow-2xl z-50 py-1 divide-y divide-zinc-50 dark:divide-zinc-800">
                          {filteredStaff.length > 0 ? (
                            filteredStaff.map((staff) => (
                              <button
                                key={staff.id}
                                type="button"
                                onClick={() => handleAddStaff(staff)}
                                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-left transition-colors"
                              >
                                <img 
                                  src={staff.photoUrl || '/logodki.png'} 
                                  alt={staff.fullName} 
                                  className="w-9 h-9 rounded-full object-cover border border-zinc-100 shadow-sm"
                                  onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">{staff.fullName}</p>
                                  <p className="text-xs text-zinc-400">NIK: {staff.username}</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="text-xs text-zinc-400 text-center py-4 flex flex-col items-center gap-1">
                              <Users className="w-5 h-5 text-zinc-300" />
                              <span>Petugas tidak ditemukan</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Staff Profile Card Grid */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">
                      Daftar Petugas Yang Ditambahkan ({selectedStaff.length})
                    </label>
                    {selectedStaff.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 max-h-[250px] overflow-y-auto pr-1">
                        {selectedStaff.map((staff) => (
                          <div 
                            key={staff.id}
                            className="bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl p-3 flex items-center gap-3.5 relative group shadow-sm hover:shadow-md hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-350"
                          >
                            <img 
                              src={staff.photoUrl || '/logodki.png'} 
                              alt={staff.fullName} 
                              className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-zinc-700 shadow-md shrink-0" 
                              onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                            />
                            <div className="flex-1 min-w-0 pr-6">
                              <p className="font-extrabold text-sm text-zinc-800 dark:text-zinc-100 truncate leading-snug">{staff.fullName}</p>
                              <p className="text-xs text-zinc-400 font-semibold mt-0.5">NIK: {staff.username}</p>
                              <span className="inline-block text-[10px] text-orange-600 dark:text-orange-400 font-extrabold bg-orange-50 dark:bg-orange-950/20 border border-orange-100/30 rounded-md px-1.5 py-0.5 mt-1">
                                PETUGAS PPSU
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveStaff(staff.id)}
                              className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-100 flex items-center justify-center transition-all shadow-sm"
                              title="Hapus petugas"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                        <p className="text-xs text-zinc-400 font-semibold max-w-[200px]">Belum ada petugas ditambahkan. Cari petugas pada kolom di atas.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsAddModalOpen(false); setEditingScheduleId(null); }}
                  className="rounded-2xl h-11 px-6 font-bold border-zinc-200 text-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-11 px-8 font-bold shadow-md hover:shadow-lg transition-all"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  {submitting ? 'Menyimpan...' : (editingScheduleId !== null ? 'Perbarui Jadwal' : 'Simpan Jadwal')}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Centered Read-Only View Modal */}
      {isViewModalOpen && viewingSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-zinc-950 dark:text-white">Detail Jadwal Penugasan</h3>
                <p className="text-xs text-zinc-500">Rincian lengkap waktu, zona, dan personel lapangan yang ditugaskan</p>
              </div>
              <button 
                onClick={() => { setIsViewModalOpen(false); setViewingSchedule(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Shift Kerja</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <span className="font-extrabold text-zinc-800 dark:text-zinc-100">{viewingSchedule.shiftName}</span>
                  </div>
                  <span className="text-xs text-zinc-500 font-semibold block mt-1">{viewingSchedule.timeRange}</span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Zona Penugasan</span>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    <span className="font-extrabold text-zinc-800 dark:text-zinc-100">{viewingSchedule.zone}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Tanggal Tugas</span>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-orange-500" />
                    <span className="font-extrabold text-zinc-800 dark:text-zinc-100">{formatDate(viewingSchedule.date)}</span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Status Shift</span>
                  <div className="mt-1">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                      viewingSchedule.status === 'Berjalan' 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                        : viewingSchedule.status === 'Selesai'
                        ? 'bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400'
                        : 'bg-amber-50 text-amber-650 dark:bg-amber-950/20 dark:text-amber-400'
                    }`}>
                      {viewingSchedule.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Staff List */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">
                  Petugas Lapangan Yang Bertugas ({viewingSchedule.assignedUsers?.length || 0} Orang)
                </span>
                
                <div className="grid grid-cols-1 gap-3 max-h-[250px] overflow-y-auto pr-1">
                  {viewingSchedule.assignedUsers && viewingSchedule.assignedUsers.map((staff) => (
                    <div 
                      key={staff.id}
                      className="bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-100/80 dark:border-zinc-800/55 rounded-2xl p-3.5 flex items-center gap-3.5"
                    >
                      <img 
                        src={staff.photoUrl || '/logodki.png'} 
                        alt={staff.fullName} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-zinc-700 shadow-md shrink-0" 
                        onError={(e) => { e.currentTarget.src = '/logodki.png'; }}
                      />
                      <div>
                        <p className="font-extrabold text-sm text-zinc-800 dark:text-zinc-100 leading-snug">{staff.fullName}</p>
                        <p className="text-xs text-zinc-400 font-semibold mt-0.5">NIK: {staff.username}</p>
                        <span className="inline-block text-[10px] text-orange-650 dark:text-orange-400 font-extrabold bg-orange-50 dark:bg-orange-950/20 border border-orange-100/30 rounded-md px-1.5 py-0.5 mt-1">
                          PETUGAS PPSU
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 p-5 flex justify-end">
              <Button
                type="button"
                onClick={() => { setIsViewModalOpen(false); setViewingSchedule(null); }}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-11 px-8 font-bold shadow-md hover:shadow-lg transition-all"
              >
                Tutup Detail
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
