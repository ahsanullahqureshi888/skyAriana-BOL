import { fileURLToPath } from 'node:url'
import os from 'node:os'
import path from 'node:path'

const localDevOrigins = ['127.0.0.1', 'localhost']
try {
  const interfaces = os.networkInterfaces()
  for (const ifaceList of Object.values(interfaces)) {
    if (!ifaceList) continue
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' || iface.family === 4) {
        localDevOrigins.push(iface.address)
      }
    }
  }
} catch (e) {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.cache = {
        type: 'filesystem',
      };
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        net: false,
        tls: false,
        child_process: false,
        "node:fs": false,
        "node:path": false,
        "node:os": false,
        "node:crypto": false,
        "node:url": false,
        "node:buffer": false,
      };
    }
    return config;
  },
  allowedDevOrigins: Array.from(new Set([
    ...localDevOrigins,
    '10.2.0.2',
    '192.168.100.10',
    '10.5.0.2',
    '10.12.12.59',
    '10.2.*.*',
    '10.*.*.*',
    '192.168.*.*',
    '*.local',
  ])),
  distDir: process.env.SKY_NEXT_DIST_DIR || '.next',
  output: process.env.SKY_STANDALONE === '1' || Boolean(process.env.SKY_NEXT_DIST_DIR) ? 'standalone' : undefined,
  outputFileTracingRoot: path.resolve(process.cwd()),
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'date-fns-jalali',
      'recharts',
      'clsx',
      'tailwind-merge',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-popover',
    ],
  },
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|ico|woff|woff2|ttf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8000/api/v1/:path*',
      },
    ]
  },
}

export default nextConfig
