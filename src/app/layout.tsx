import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const res = await fetch(`${apiBase}/settings`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const settings = await res.json();
      const title = settings.systemName || "PPSU Smart Monitoring";
      const logo = settings.logoUrl || "/logodki.png";

      return {
        title,
        applicationName: title,
        description: settings.systemDescription || "Jakarta Smart City Monitoring System",
        icons: {
          icon: logo,
          shortcut: logo,
          apple: logo,
        },
        appleWebApp: {
          title,
          statusBarStyle: "default",
          capable: true,
        },
      };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn("⚠️ Dynamic metadata fetch aborted (backend not ready during build), using fallback.");
    } else {
      console.error("Dynamic metadata fetch failed, using fallback:", error.message || error);
    }
  }

  // Fallback metadata
  return {
    title: "PPSU Smart Monitoring",
    applicationName: "PPSU Smart Monitoring",
    description: "Jakarta Smart City Monitoring System",
    icons: {
      icon: '/logodki.png',
      apple: '/logodki.png',
    },
    appleWebApp: {
      title: "PPSU Smart",
      capable: true,
    },
  };
}




import SettingsProvider from '@/components/SettingsProvider';

export const viewport: Viewport = {
  themeColor: "#FF8C00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
