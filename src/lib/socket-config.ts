// Centralized Socket URL configuration
// Uses same origin as API (without /api path) so socket.io goes through reverse proxy

export function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (typeof window !== 'undefined') {
    // Browser: use same origin (relies on reverse proxy or Next.js rewrites)
    return `${window.location.protocol}//${window.location.host}`;
  }
  return 'http://localhost:3001';
}

export const socketUrl = getSocketUrl();
