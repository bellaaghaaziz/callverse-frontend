import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// Keep the development watcher independent from production build artifacts.
const nextConfig = (phase: string): NextConfig => {
  const config: NextConfig = {
    distDir: process.env.CALLVERSE_BUILD_DIR ||
      (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"),
  };
  // Keep this optional build setting out of the Turbopack development server.
  if (phase !== PHASE_DEVELOPMENT_SERVER && process.env.CALLVERSE_BUILD_NO_CACHE === "1") {
    config.webpack = webpackConfig => { webpackConfig.cache = false; return webpackConfig; };
  }
  return config;
};

export default nextConfig;
