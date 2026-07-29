import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use custom build directory to avoid Windows file locks during local production builds/deploys.
  distDir: process.env.NEXT_BUILD_DIR || (process.env.NODE_ENV === 'development' ? '.next-local' : '.next'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'placeholder.co',
      },
      {
        protocol: 'https',
        hostname: 'files.cdn.printful.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
    ],
  },
  // Ensure prisma/dev.db binary is traced and bundled into the serverless function
  outputFileTracingIncludes: {
    '/api/**': ['./prisma/dev.db'],
    '/merch/**': ['./prisma/dev.db'],
  },
  // Exclude sharp from server bundle to avoid native module issues on Windows
  serverExternalPackages: ['sharp'],
  // Use webpack for production builds to avoid Turbopack/sharp issues on Windows
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('sharp');
    }
    return config;
  },
  // Disable Turbopack to avoid issues with custom webpack config
  turbopack: {
    resolveAlias: {},
  },
};

export default nextConfig;
