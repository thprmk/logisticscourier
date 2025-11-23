import type { NextConfig } from "next";
import withPWAInit from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
  turbopack: {},  // Add empty turbopack config to silence warning
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
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    skipWaiting: true,
  },
});

export default withPWA(nextConfig);
