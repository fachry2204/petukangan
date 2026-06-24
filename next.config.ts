import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  allowedDevOrigins: ['192.168.18.4', '192.168.18.4:3000', 'localhost:3000', '127.0.0.1', '127.0.0.1:3000'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ]
  }
};

export default nextConfig;
