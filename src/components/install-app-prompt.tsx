'use client';

import { useEffect, useState } from 'react';
import { Download, PlusSquare, Share2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandaloneMode() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroidDevice() {
  return /android/i.test(navigator.userAgent);
}

export default function InstallAppPrompt() {
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }

    if (isStandaloneMode()) return;

    const dismissedThisSession = sessionStorage.getItem('install-app-prompt-dismissed') === 'true';
    if (dismissedThisSession) return;

    if (isIosDevice()) {
      const showIosPrompt = window.setTimeout(() => {
        setPlatform('ios');
        setIsVisible(true);
      }, 0);

      return () => window.clearTimeout(showIosPrompt);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      if (!isAndroidDevice() || isStandaloneMode()) return;
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setPlatform('android');
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const closePrompt = () => {
    sessionStorage.setItem('install-app-prompt-dismissed', 'true');
    setIsVisible(false);
  };

  const installOnAndroid = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === 'accepted') {
      setIsVisible(false);
    }
  };

  if (!isVisible || !platform) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-app-title"
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/60 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <button
          type="button"
          onClick={closePrompt}
          aria-label="Tutup popup instalasi"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
          <Download className="h-8 w-8" />
        </div>

        <div className="space-y-2 pr-8">
          <h2 id="install-app-title" className="text-xl font-black text-zinc-950 dark:text-white">
            Instal PPSU System
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Pasang aplikasi di layar utama agar dapat dibuka langsung tanpa masuk melalui browser.
          </p>
        </div>

        {platform === 'android' ? (
          <button
            type="button"
            onClick={installOnAndroid}
            disabled={!installPrompt}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Instal Aplikasi
          </button>
        ) : (
          <div className="mt-6 space-y-3 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
            <div className="flex items-center gap-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Share2 className="h-4 w-4" />
              </span>
              1. Tekan tombol Share di browser
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                <PlusSquare className="h-4 w-4" />
              </span>
              2. Pilih “Add to Home Screen”
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
