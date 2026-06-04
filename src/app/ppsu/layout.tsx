'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { ActiveSOSLock } from '@/components/active-sos-lock';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { ShieldAlert, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Map attendance status to a simplified status string for the map marker
function resolveMapStatus(attendanceStatus: string): string {
  const s = (attendanceStatus || '').toLowerCase();
  
  // Check for specific statuses in priority order
  if (s.includes('pulang') || s.includes('check-out') || s.includes('checkout') || s.includes('sudah pulang')) 
    return 'Pulang';
  if (s.includes('selesai istirahat') || s.includes('kembali bekerja') || s.includes('selesai break')) 
    return 'Kembali Bekerja';
  if (s.includes('istirahat') || s.includes('absen istirahat') || s.includes('break')) 
    return 'Istirahat';
  if (s.includes('sudah absen') || s.includes('sudah masuk') || s.includes('absen masuk') || s.includes('check-in') || s.includes('masuk')) 
    return 'Absen Masuk';
  if (s.includes('belum absen') || s.includes('libur') || s.includes('menunggu')) 
    return 'Online';
  
  return 'Online';
}

export default function PpsuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = useSettingsStore();
  const { token, user } = useAuthStore();
  const socketRef = useRef<any>(null);
  const attendanceStatusRef = useRef<string>('Online');
  // Last known GPS — used to re-emit heartbeats so admin map keeps the marker alive
  const lastGpsRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const wakeLockRef = useRef<any>(null);

  const [gpsModalVisible, setGpsModalVisible] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState('Silakan klik tombol di bawah untuk mengizinkan akses lokasi.');
  const [isRequestingGps, setIsRequestingGps] = useState(false);

  // Fetch today's attendance status so we can include it in location updates
  useEffect(() => {
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/attendance/today`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.status) {
          attendanceStatusRef.current = resolveMapStatus(data.status);
        }
      })
      .catch(() => {});

    // Also re-check periodically in case the user absen within the same session
    const interval = setInterval(() => {
      fetch(`${apiUrl}/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.status) {
            const resolved = resolveMapStatus(data.status);
            attendanceStatusRef.current = resolved;
            // Re-emit location with new status if socket connected.
            // Reuse last known GPS so the marker is not wiped out.
            if (socketRef.current?.connected && user) {
              const g = lastGpsRef.current;
              socketRef.current.emit('updateLocation', {
                userId: user.id,
                fullName: user.fullName,
                photoUrl: user.photoUrl,
                status: resolved,
                lat: g?.lat ?? null,
                lng: g?.lng ?? null,
                gpsStatus: !!g,
                timestamp: Date.now(),
              });
            }
          }
        })
        .catch(() => {});
    }, 30000); // every 30 seconds

    return () => clearInterval(interval);
  }, [token, user]);

  useEffect(() => {
    if (!token || !user || typeof window === 'undefined') return;

    let watchId: number;
    let socket: any;
    let heartbeatInterval: any;
    let pollInterval: any;
    let nativeWatcherId: string | null = null;
    let BackgroundGeolocation: any = null;
    let Capacitor: any = null;

    // Try to keep the screen awake so background throttling is reduced.
    const acquireWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          // @ts-ignore
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current?.addEventListener?.('release', () => {
            // Will re-acquire on visibilitychange below.
          });
        }
      } catch (_) { /* not critical */ }
    };

    // Get device and connection info
    const getDeviceInfo = () => {
      const ua = navigator.userAgent;
      let device = 'Unknown Device';
      let os = 'Unknown OS';
      
      // Detect OS
      if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Mac')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iOS')) os = 'iOS';
      
      // Detect device type
      if (ua.includes('Mobile')) device = 'Mobile Browser';
      else if (ua.includes('Tablet')) device = 'Tablet';
      else device = 'Desktop/Laptop';
      
      // Get connection info if available
      const conn = (navigator as any).connection;
      const provider = conn?.effectiveType || '';
      
      return { device, os, provider };
    };

    const emitWithGps = (pos: GeolocationPosition) => {
      lastGpsRef.current = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: Date.now(),
      };
      
      const deviceInfo = getDeviceInfo();
      
      socketRef.current?.emit('updateLocation', {
        userId: user.id,
        fullName: user.fullName,
        photoUrl: user.photoUrl,
        status: attendanceStatusRef.current,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        gpsStatus: true,
        timestamp: Date.now(),
        device: deviceInfo.device,
        os: deviceInfo.os,
        provider: deviceInfo.provider,
      });
    };

    const emitHeartbeat = () => {
      if (!socketRef.current?.connected) return;
      const g = lastGpsRef.current;
      const deviceInfo = getDeviceInfo();
      socketRef.current.emit('updateLocation', {
        userId: user.id,
        fullName: user.fullName,
        photoUrl: user.photoUrl,
        status: attendanceStatusRef.current,
        lat: g?.lat ?? null,
        lng: g?.lng ?? null,
        gpsStatus: !!g,
        timestamp: Date.now(),
        device: deviceInfo.device,
        os: deviceInfo.os,
        provider: deviceInfo.provider,
      });
    };

    // Try to detect Capacitor native runtime and start native background
    // geolocation. Returns true when the native watcher was started.
    const startNativeBackgroundTracking = async (): Promise<boolean> => {
      try {
        const cap = await import('@capacitor/core').catch(() => null as any);
        if (!cap?.Capacitor?.isNativePlatform || !cap.Capacitor.isNativePlatform()) {
          return false;
        }
        Capacitor = cap.Capacitor;
        BackgroundGeolocation = cap.registerPlugin('BackgroundGeolocation');
        nativeWatcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'GPS PPSU sedang aktif - jangan tutup aplikasi.',
            backgroundTitle: 'SI PETUT - Live Tracking',
            requestPermissions: true,
            stale: false,
            distanceFilter: 5,
          },
          (location: any, error: any) => {
            if (error) {
              console.warn('Native BG Geolocation error:', error);
              if (error.code === 'NOT_AUTHORIZED') {
                BackgroundGeolocation.openSettings();
              }
              emitHeartbeat();
              return;
            }
            if (!location) return;
            // Reuse the same emit pipeline so admin map updates identically.
            emitWithGps({
              coords: {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                altitude: location.altitude ?? null,
                altitudeAccuracy: location.altitudeAccuracy ?? null,
                heading: location.bearing ?? null,
                speed: location.speed ?? null,
              },
              timestamp: location.time || Date.now(),
            } as unknown as GeolocationPosition);
            setGpsModalVisible(false);
            setIsRequestingGps(false);
          },
        );
        return true;
      } catch (e) {
        console.warn('Native BG geolocation unavailable, falling back to web:', e);
        return false;
      }
    };

    const setupTracking = async () => {
      const ioModule = await import('socket.io-client');
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://${window.location.hostname}:3001`;
      socket = ioModule.io(socketUrl, { auth: { token, userId: user.id, fullName: user.fullName, photoUrl: user.photoUrl } });
      socketRef.current = socket;

      const handleConnected = async () => {
        // Prefer native background geolocation when available.
        const usedNative = await startNativeBackgroundTracking();
        if (usedNative) {
          // Heartbeat still useful to keep marker fresh when device is static.
          heartbeatInterval = setInterval(emitHeartbeat, 8000);
          return;
        }

        if (!navigator.geolocation) {
          setGpsStatusMessage('GPS tidak didukung di perangkat ini.');
          setIsRequestingGps(false);
          return;
        }

        const sendLocation = (pos: GeolocationPosition) => {
          setGpsModalVisible(false);
          setIsRequestingGps(false);
          emitWithGps(pos);
        };

        const handleGpsError = (err: any) => {
          console.warn('GPS Error:', err);
          // If we still have a previous fix, keep showing the marker via heartbeat.
          if (lastGpsRef.current) {
            emitHeartbeat();
            return;
          }
          let errMsg = 'Gagal mendapatkan lokasi. Pastikan GPS aktif.';
          if (err.code === 1) errMsg = 'Akses lokasi ditolak. Izinkan di pengaturan browser.';
          if (err.code === 2) errMsg = 'Sinyal GPS tidak ditemukan. Cari area terbuka.';
          if (err.code === 3) errMsg = 'Pencarian lokasi timeout. Coba lagi.';
          setGpsStatusMessage(errMsg);
          setGpsModalVisible(true);
          setIsRequestingGps(false);
        };

        watchId = navigator.geolocation.watchPosition(
          sendLocation,
          handleGpsError,
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );

        // Periodic active poll — many devices throttle watchPosition when the
        // user is stationary, which causes the admin marker to look "stale".
        // We force a getCurrentPosition every 10s and always emit.
        pollInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => emitWithGps(pos),
            () => emitHeartbeat(), // fallback: re-emit last known GPS
            { enableHighAccuracy: true, maximumAge: 8000, timeout: 12000 },
          );
        }, 10000);

        // Lightweight heartbeat every 8s using last known GPS, so the admin
        // map always shows the marker as alive even if the OS hasn't returned
        // a new fix yet.
        heartbeatInterval = setInterval(emitHeartbeat, 8000);
      };

      if (socket.connected) {
        handleConnected();
      } else {
        socket.on('connect', handleConnected);
      }

      // Re-emit immediately whenever the socket reconnects.
      socket.on('reconnect', () => emitHeartbeat());

      socket.on('forceLogout', () => {
        socket.disconnect();
        useAuthStore.getState().logout();
        window.location.href = '/login';
      });
    };

    setupTracking();
    acquireWakeLock();

    // When the tab becomes visible again (user came back from another app /
    // unlocked the device), re-acquire wake lock and force a fresh GPS fix.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        acquireWakeLock();
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => emitWithGps(pos),
            () => emitHeartbeat(),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
          );
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (pollInterval) clearInterval(pollInterval);
      if (nativeWatcherId && BackgroundGeolocation) {
        try { BackgroundGeolocation.removeWatcher({ id: nativeWatcherId }); } catch (_) {}
        nativeWatcherId = null;
      }
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (_) {}
        wakeLockRef.current = null;
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, user]);

  const retryGps = () => {
    setIsRequestingGps(true);
    setGpsStatusMessage('Meminta izin lokasi dari perangkat Anda...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsModalVisible(false);
        setIsRequestingGps(false);
        if (socketRef.current && user) {
          socketRef.current.emit('updateLocation', {
            userId: user.id,
            fullName: user.fullName,
            photoUrl: user.photoUrl,
            status: attendanceStatusRef.current,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            gpsStatus: true,
            timestamp: Date.now()
          });
        }
      },
      (err) => {
        let errMsg = 'Gagal mendapatkan lokasi. Pastikan GPS aktif.';
        if (err.code === 1) errMsg = 'Akses lokasi ditolak. Izinkan di pengaturan browser.';
        if (err.code === 2) errMsg = 'Sinyal GPS tidak ditemukan. Cari area terbuka.';
        if (err.code === 3) errMsg = 'Pencarian lokasi timeout. Coba lagi.';
        setGpsStatusMessage(errMsg);
        setGpsModalVisible(true);
        setIsRequestingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-zinc-950 pb-20">
      <header className="sticky top-0 z-[999] w-full bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <img src={settings.logoUrl || '/logodki.png'} alt="Logo DKI" className="w-8 h-8 object-contain drop-shadow-sm" />
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-black text-zinc-900 dark:text-white uppercase leading-none">
                {settings.systemName || 'PPSU SMART'}
              </h1>
              {settings.systemDescription && (
                <span className="text-lg font-black text-zinc-900 dark:text-white uppercase leading-none hidden sm:inline-block">
                  — {settings.systemDescription}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-zinc-500">Live Tracking</span>
          </div>
        </div>

        {/* Horizontal Traditional Ornament gigi balang */}
        <div
          className="absolute left-0 right-0 top-full w-full h-6 bg-repeat-x bg-contain pointer-events-none"
          style={{ backgroundImage: "url('/gambar/ornamen.png')" }}
        />
      </header>

      <main className="w-full max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        {children}
      </main>

      <ActiveSOSLock />
      <BottomNav />

      {/* Mandatory GPS Error Modal */}
      {gpsModalVisible && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border-2 border-orange-500 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(249,115,22,0.3)] text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              {isRequestingGps && <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20"></div>}
              <MapPin className={`w-10 h-10 ${isRequestingGps ? 'animate-bounce' : ''}`} />
            </div>

            <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-2">
              Akses Lokasi Diperlukan
            </h3>

            <div className="mb-6">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                Sistem membutuhkan akses GPS (High Accuracy) untuk mengaktifkan fitur Live Tracking.
              </p>
              <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 p-3 rounded-xl">
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                  {gpsStatusMessage}
                </p>
              </div>
            </div>

            <Button
              onClick={retryGps}
              disabled={isRequestingGps}
              className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-500/30 text-base tracking-wide"
            >
              {isRequestingGps ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> MEMPROSES...</> : 'AKTIFKAN GPS SEKARANG'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
