import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for performance
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },

  // Enable gzip/brotli compression
  compress: true,

  // Generate source maps only in development
  productionBrowserSourceMaps: false,

  // Strict mode for better React practices
  reactStrictMode: true,

  // Reduce image optimization memory usage
  images: {
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
