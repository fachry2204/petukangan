'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { usePathname } from 'next/navigation';
import axios from 'axios';
import Head from 'next/head';

// Dynamic Axios request interceptor to automatically adapt to localhost or local Wi-Fi IP address
if (typeof window !== 'undefined') {
  // Gracefully handle DOM mutations by translation extensions to prevent React unmount crashes
  if (typeof Node === 'function' && Node.prototype) {
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) {
        return child;
      }
      return originalRemoveChild.apply(this, arguments as any) as any;
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        return newNode;
      }
      return originalInsertBefore.apply(this, arguments as any) as any;
    };
  }

  axios.interceptors.request.use((config) => {
    if (config.url) {
      const currentHost = window.location.hostname;
      config.url = config.url
        .replace('localhost:3001', `${currentHost}:3001`)
        .replace('192.168.18.4:3001', `${currentHost}:3001`);
    }
    return config;
  }, (error) => {
    return Promise.reject(error);
  });
}

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettingsStore();
  const { user, logout } = useAuthStore();
  const pathname = usePathname();

  // Load settings from backend database on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await axios.get(`${apiUrl}/settings`);
        settings.setSettings(res.data);
      } catch (err) {
        console.error('Failed to load database settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // Handle Favicon Dynamic Injection
  useEffect(() => {
    if (!settings.logoUrl) return;

    // 1. Remove all existing favicon/icon links to avoid conflicts
    const existingLinks = document.querySelectorAll(
      "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon'], link[rel~='icon']"
    );
    existingLinks.forEach(el => el.remove());

    // 2. Create a brand new link element for the favicon
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.href = settings.logoUrl;
    
    // Support image types dynamically
    if (settings.logoUrl.endsWith('.png')) {
      newLink.type = 'image/png';
    } else if (settings.logoUrl.endsWith('.jpg') || settings.logoUrl.endsWith('.jpeg')) {
      newLink.type = 'image/jpeg';
    } else if (settings.logoUrl.endsWith('.svg')) {
      newLink.type = 'image/svg+xml';
    } else {
      newLink.type = 'image/x-icon';
    }
    
    document.head.appendChild(newLink);

    // Also update document title
    if (settings.systemName) {
      document.title = settings.systemName;
    }
  }, [settings.logoUrl, settings.systemName]);

  // Role bisa berupa object { name: 'ADMIN' } atau string 'ADMIN'
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.name;
  const isAdmin = userRole === 'ADMIN';
  const isMaintenanceMode = settings.maintenanceActive && !isAdmin;

  if (isMaintenanceMode && !pathname.startsWith('/login')) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-950"
        style={{
          backgroundImage: 'url(/gambar/maintenance.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark Overlay for better contrast */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-0" />

        <style dangerouslySetInnerHTML={{__html: `
          .theme-bg { background-color: ${settings.mainColor} !important; }
          .theme-text { color: ${settings.mainColor} !important; }
        `}} />
        <div className="max-w-lg w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden text-center p-12 relative z-10 border border-white/10">
          <img src={settings.logoUrl || '/logodki.png'} alt="Logo" className="w-24 h-24 mx-auto mb-8 object-contain" />
          <h1 className="text-3xl font-black text-zinc-900 mb-4">{settings.maintenanceTitle}</h1>
          <p className="text-zinc-600 mb-8 leading-relaxed">{settings.maintenanceDesc}</p>
          
          {settings.maintenanceEnd && (
            <div className="bg-orange-50 theme-bg/10 rounded-2xl p-6 border border-orange-100">
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Perkiraan Selesai</p>
              <p className="text-xl font-bold theme-text text-orange-600">
                {new Date(settings.maintenanceEnd).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>
          )}

          {/* Premium Back button to return to login */}
          <div className="mt-8">
            <button
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-zinc-50 text-zinc-800 font-bold border border-zinc-200 rounded-2xl shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --primary: ${settings.mainColor};
        }
        .bg-orange-500, .bg-orange-600, .hover\\:bg-orange-600:hover, .data-\\[state\\=active\\]\\:bg-orange-500[data-state="active"] { 
          background-color: ${settings.mainColor} !important; 
        }
        .text-orange-500, .text-orange-600, .hover\\:text-orange-500:hover { 
          color: ${settings.mainColor} !important; 
        }
        .border-orange-500, .border-orange-200 { 
          border-color: ${settings.mainColor} !important; 
        }
        .ring-orange-500, .focus\\:ring-orange-500:focus { 
          --tw-ring-color: ${settings.mainColor} !important; 
        }
      `}} />
      {children}
    </>
  );
}
