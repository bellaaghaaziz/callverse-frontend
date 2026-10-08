import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.CALLVERSE_BUILD_DIR || ".next",
};

export default nextConfig;
