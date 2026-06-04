// Centralized API URL configuration
// In production browser, auto-detects the current host so requests go through the same domain
// Falls back to localhost:3001/api only in SSR/dev when no env var is set

function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    // Browser: use the same origin with /api prefix (relies on reverse proxy or Next.js rewrites)
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  // SSR fallback (dev server)
  return 'http://localhost:3001/api';
}

export const apiUrl = getApiUrl();
