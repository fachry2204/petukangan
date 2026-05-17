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

  shifts: [],
  zones: [],

  setSettings: (settings) => set((state) => ({ ...state, ...settings })),
}));
