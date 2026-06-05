// Centralized Socket URL configuration
// Full-stack Next.js: socket.io via same-origin

export function getSocketUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return 'http://localhost:3000';
}

export const socketUrl = getSocketUrl();
