import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ['192.168.18.4', '192.168.18.4:3000', 'localhost:3000']
} as any;

export default nextConfig;
