// Centralized API URL configuration
// Production: uses env var or auto-detects from current domain
// Dev: falls back to localhost:3001/api

function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    // Production domain - backend runs on same domain (Plesk reverse proxy or direct)
    if (host.includes('petukanganutara.id')) {
      return `${window.location.protocol}//${host}/api`;
    }
    // Local dev / other domains
    return `${window.location.protocol}//${host}/api`;
  }
  // SSR fallback (dev server)
  return 'http://localhost:3001/api';
}

export const apiUrl = getApiUrl();
