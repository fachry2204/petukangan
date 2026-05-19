import { MetadataRoute } from 'next';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let systemName = 'PPSU Smart';
  let description = 'Sistem Monitoring PPSU';
  let logoUrl = '/logodki.png';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    // Ambil data pengaturan dari database
    const res = await fetch('http://localhost:3001/settings', { 
      next: { revalidate: 60 },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const settings = await res.json();
      systemName = settings.systemName || systemName;
      description = settings.systemDescription || description;
      logoUrl = settings.logoUrl || logoUrl;
    }
  } catch (error) {
    console.error('Failed to fetch settings for manifest:', error);
  }

  return {
    name: systemName,
    short_name: systemName,
    description: description,
    start_url: '/login',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#FF8C00',
    icons: [
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
