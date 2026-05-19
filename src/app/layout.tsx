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

export const metadata: Metadata = {
  title: "PPSU Smart Monitoring",
  description: "Jakarta Smart City Monitoring System",
};

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

