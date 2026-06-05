// Centralized API URL configuration
// Full-stack Next.js: semua API di /api/* (Next.js API Routes)

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  // SSR fallback
  return 'http://localhost:3000/api';
}

export const apiUrl = getApiUrl();
