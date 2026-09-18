import { MetadataRoute } from 'next';
import { queryDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ManifestSettings {
  systemName?: string;
  systemDescription?: string;
  mainColor?: string;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let systemName = 'PPSU System';
  let description = 'Monitoring PJLP';
  let mainColor = '#f97316';

  try {
    const rows = await queryDb(
      'SELECT systemName, systemDescription, mainColor FROM system_settings LIMIT 1'
    ) as ManifestSettings[];
    const settings = rows?.[0];
    if (settings) {
      systemName = settings.systemName || systemName;
      description = settings.systemDescription || description;
      mainColor = settings.mainColor || mainColor;
    }
  } catch (error: unknown) {
    console.error(
      'Failed to fetch settings for manifest:',
      error instanceof Error ? error.message : error
    );
  }

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
        src: '/pwa-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
