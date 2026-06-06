import { MetadataRoute } from 'next';
import { queryDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let systemName = 'SI PETUT';
  let description = 'Monitoring PPSU';
  let logoUrl = '/logodki.png';
  let mainColor = '#f97316';

  try {
    const rows: any = await queryDb(
      'SELECT systemName, systemDescription, logoUrl, mainColor FROM system_settings LIMIT 1'
    );
    const settings = rows?.[0];
    if (settings) {
      systemName = settings.systemName || systemName;
      description = settings.systemDescription || description;
      logoUrl = settings.logoUrl || logoUrl;
      mainColor = settings.mainColor || mainColor;
    }
  } catch (error: any) {
    console.error('Failed to fetch settings for manifest:', error?.message || error);
  }

  const lowerLogo = String(logoUrl || '').toLowerCase();
  const iconType = lowerLogo.endsWith('.svg')
    ? 'image/svg+xml'
    : lowerLogo.endsWith('.jpg') || lowerLogo.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'image/png';

  return {
    name: systemName,
    short_name: systemName,
    description: description,
    start_url: '/login',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: mainColor,
    icons: [
      {
        src: logoUrl,
        sizes: '192x192',
        type: iconType,
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: iconType,
      },
    ],
  };
}
