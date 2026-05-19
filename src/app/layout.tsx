import type { Metadata } from "next";
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
    // Attempt to fetch settings directly from the backend server
    const res = await fetch('http://localhost:3001/settings', { cache: 'no-store' });
    if (res.ok) {
      const settings = await res.json();
      const title = settings.systemName || "PPSU Smart Monitoring";
      const logo = settings.logoUrl || "/logodki.png";
      
      return {
        title: title,
        description: settings.systemDescription || "Jakarta Smart City Monitoring System",
        icons: {
          icon: logo,
          shortcut: logo,
          apple: logo, // Generates <link rel="apple-touch-icon"> for iOS Home Screen
        },
        appleWebApp: {
          title: title, // Sets the name under the icon on iOS Home Screen
          statusBarStyle: "default",
          capable: true,
        }
      };
    }
  } catch (error) {
    console.error("Dynamic metadata fetch failed, using fallback:", error);
  }

  // Fallback metadata if database is unreachable
  return {
    title: "PPSU Smart Monitoring",
    description: "Jakarta Smart City Monitoring System",
    icons: {
      icon: '/logodki.png',
      apple: '/logodki.png',
    },
    appleWebApp: {
      title: "PPSU Smart",
      capable: true,
    }
  };
}

import SettingsProvider from '@/components/SettingsProvider';

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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF8C00" />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning={true}>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>

    </html>
  );
}

