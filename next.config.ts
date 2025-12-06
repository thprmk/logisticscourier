import type { NextConfig } from "next";
import withPWAInit from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
  // turbopack: {}, // Not needed for Next.js 15
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  disable: false, // Explicitly enable PWA
  workboxOptions: {
    skipWaiting: true,
    importScripts: ['/push-sw.js'],
  },
});

export default withPWA(nextConfig);
