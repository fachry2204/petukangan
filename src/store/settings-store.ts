import { create } from 'zustand';

interface SettingsState {
  logoUrl: string;
  bgType: 'image' | 'video';
  bgImage: string;
  bgVideo: string;
  bgVideoVolume: number; // Volume 0 - 100
  systemName: string;
  systemDescription: string;
  mainColor: string;
  
  maintenanceActive: boolean;
  maintenanceEnd: string;
  maintenanceTitle: string;
  maintenanceDesc: string;

  gpsUpdateInterval: number; // detik, interval update lokasi GPS petugas

  roleAccess: Record<string, Record<string, boolean>>;
  rolePermissions: Record<string, { canEdit: boolean; canDelete: boolean }>;

  footerText: string;
  footerShowOnAdmin: boolean;
  footerShowOnLogin: boolean;

  shifts: any[];
  zones: string[];

  setSettings: (settings: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  logoUrl: '/logodki.png',
  bgType: 'image',
  bgImage: '/bg.jpg',
  bgVideo: '',
  bgVideoVolume: 0, // Default muted/0 for seamless autoplay
  systemName: 'SIPETUT',
  systemDescription: 'Monitoring & Management System',
  mainColor: '#f97316', // orange-500

  maintenanceActive: false,
  maintenanceEnd: '',
  maintenanceTitle: 'Sistem Dalam Perbaikan',
  maintenanceDesc: 'Kami sedang melakukan pemeliharaan sistem. Silakan kembali lagi nanti.',

  gpsUpdateInterval: 30, // default 30 detik

  roleAccess: {
    ADMIN: {
      '/admin/dashboard': true,
      '/admin/monitoring': true,
      '/admin/online-officers': true,
      '/admin/gps-history': true,
      '/admin/sos': true,
      '/admin/users': true,
      '/admin/attendance': true,
      '/admin/schedules': true,
      '/admin/tasks': true,
      '/admin/reports': true,
      '/admin/settings': true,
    },
    STAFF: {
      '/admin/dashboard': true,
      '/admin/monitoring': true,
      '/admin/online-officers': true,
      '/admin/gps-history': true,
      '/admin/sos': true,
      '/admin/users': true,
      '/admin/attendance': true,
      '/admin/schedules': true,
      '/admin/tasks': true,
      '/admin/reports': true,
      '/admin/settings': false,
    },
    PIMPINAN: {
      '/admin/dashboard': true,
      '/admin/monitoring': true,
      '/admin/online-officers': true,
      '/admin/gps-history': true,
      '/admin/sos': true,
      '/admin/users': false,
      '/admin/attendance': false,
      '/admin/schedules': false,
      '/admin/tasks': false,
      '/admin/reports': true,
      '/admin/settings': false,
    },
  },

  rolePermissions: {
    ADMIN: { canEdit: true, canDelete: true },
    STAFF: { canEdit: true, canDelete: true },
    PIMPINAN: { canEdit: false, canDelete: false },
  },

  footerText: 'Kelurahan Petukangan Utara © 2026',
  footerShowOnAdmin: true,
  footerShowOnLogin: true,

  shifts: [],
  zones: [],

  setSettings: (settings) => set((state) => ({ ...state, ...settings })),
}));
