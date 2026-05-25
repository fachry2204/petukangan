import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ['192.168.18.4', '192.168.18.4:3000', 'localhost:3000', '127.0.0.1', '127.0.0.1:3000'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3001/socket.io/:path*',
      }
    ];
  }
} as any;

export default nextConfig;
