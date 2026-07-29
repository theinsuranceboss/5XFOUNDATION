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
    ],
  },
  // Ensure prisma/dev.db binary is traced and bundled into the serverless function
  outputFileTracingIncludes: {
    '/api/**': ['./prisma/dev.db'],
    '/merch/**': ['./prisma/dev.db'],
  },
};

export default nextConfig;
