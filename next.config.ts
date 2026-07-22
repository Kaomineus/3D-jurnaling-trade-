import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow server-side packages needed for Prisma Postgres
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Allow images from Uploadthing CDN
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
      },
    ],
  },
};

export default nextConfig;
