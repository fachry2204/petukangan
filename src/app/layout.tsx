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
