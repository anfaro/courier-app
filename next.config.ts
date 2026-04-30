import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.1.4'],
  webpack: (config) => {
    // Ensure watchOptions exists
    if (!config.watchOptions) {
      config.watchOptions = {};
    }

    config.watchOptions = {
      ...config.watchOptions,
      // Tell Webpack to explicitly ignore restricted Android system paths
      // Make sure there are NO empty strings here!
      ignored: [
        '**/node_modules',
        '**/.git',
        '/data/data/**',
        '/data/**',
        '/storage/**',
        '/' // Stops the watcher from trying to scan the absolute Android root
      ],
    };

    return config;
  },
};

export default nextConfig;
