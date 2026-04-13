import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/admin",
        destination: "http://localhost:3000/admin",
      },
      {
        source: "/admin/:path*",
        destination: "http://localhost:3000/admin/:path*",
      },
    ];
  },
};

export default nextConfig;
