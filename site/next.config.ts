import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules at runtime
  serverExternalPackages: ['@electric-sql/pglite'],
  images: { remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }] },
};

export default nextConfig;
