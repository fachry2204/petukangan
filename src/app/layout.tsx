import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { queryDb } from "@/lib/db";

const plusJakarta = localFont({
  src: [
    {
      path: "../../public/font/PlusJakartaDisplay-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/font/PlusJakartaDisplay-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/font/PlusJakartaDisplay-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-plus-jakarta",
});

export async function generateMetadata(): Promise<Metadata> {
  let systemName = "SIPETUT";
  let systemDescription = "Monitoring & Management System";
  let logoUrl = "/logodki.png";

  try {
    const rows: any = await queryDb(
      "SELECT systemName, systemDescription, logoUrl FROM system_settings LIMIT 1"
    );
    const settings = rows?.[0];
    if (settings) {
      systemName = settings.systemName || systemName;
      systemDescription = settings.systemDescription || systemDescription;
      logoUrl = settings.logoUrl || logoUrl;
    }
  } catch {}

  return {
    title: systemName,
    applicationName: systemName,
    description: systemDescription,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: logoUrl,
      apple: logoUrl,
    },
    appleWebApp: {
      title: systemName,
      capable: true,
    },
    openGraph: {
      title: systemName,
      description: systemDescription,
      siteName: systemName,
      images: [
        {
          url: logoUrl,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: systemName,
      description: systemDescription,
      images: [logoUrl],
    },
  };
}




import SettingsProvider from '@/components/SettingsProvider';

export const viewport: Viewport = {
  themeColor: "#FF8C00",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let isDbOnline = true;
  try {
    await queryDb("SELECT 1");
  } catch (error) {
    console.error("Database connection failed in RootLayout:", error);
    isDbOnline = false;
  }

  if (!isDbOnline) {
    return (
      <html lang="id" className={`${plusJakarta.variable} h-full antialiased`}>
        <head>
          <meta name="google" content="notranslate" />
        </head>
        <body className="min-h-full flex items-center justify-center bg-zinc-950 font-sans" suppressHydrationWarning={true}>
          <div className="text-center space-y-6 p-8 max-w-md w-full bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 m-4">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">System Sedang Offline</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Mohon maaf, saat ini sistem tidak dapat terhubung ke database atau sedang dalam proses perbaikan server (Maintenance). Silakan coba kembali beberapa saat lagi.
            </p>
            <div className="pt-4">
              <a href="/" className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors w-full">
                Coba Muat Ulang
              </a>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html
      lang="id"
      translate="no"
      className={`${plusJakarta.variable} h-full antialiased notranslate`}
      suppressHydrationWarning={true}
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning={true}>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
