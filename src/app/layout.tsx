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
  // Skip dynamic metadata fetch during build time - use fallback
  // This allows deployment to any domain without manual configuration
  // The real metadata will be fetched client-side via SettingsProvider

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
