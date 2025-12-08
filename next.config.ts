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
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development to avoid Babel issues
  workboxOptions: {
    skipWaiting: true,
    importScripts: ['/push-sw.js'],
    // 👇 NEW: Prevent caching of API routes to fix Login/Session issues
    runtimeCaching: [
      {
        urlPattern: /\/api\/.*$/i,
        handler: 'NetworkOnly',
        options: {
          backgroundSync: {
            name: 'api-retry',
            options: {
              maxRetentionTime: 24 * 60,
            },
          },
        },
      },
      {
        // Default handler for other resources (images, css, etc)
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'offlineCache',
          expiration: {
            maxEntries: 200,
          },
        },
      },
    ],
  },
});

export default withPWA(nextConfig);
