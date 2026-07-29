import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || (process.env.NODE_ENV === 'development' ? '.next-local' : '.next'),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'placeholder.co' },
      { protocol: 'https', hostname: 'files.cdn.printful.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: '*.convex.cloud' },
    ],
  },
  serverExternalPackages: ['sharp'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('sharp');
    }
    return config;
  },
  turbopack: {
    resolveAlias: {},
  },
};

export default nextConfig;
