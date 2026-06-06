import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: false,
  output: 'export',
  distDir: 'dist',
  allowedDevOrigins: ['192.168.18.4', '192.168.18.4:3000', 'localhost:3000', '127.0.0.1', '127.0.0.1:3000'],
} as any;

export default nextConfig;
