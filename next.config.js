/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static page generation for authenticated routes
  experimental: {
    // This is deprecated in Next.js 14, but keeping for reference
  },
  
  // Image domains (if using external images)
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for canvas module if needed
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    return config;
  },
  
  // Output configuration
  output: 'standalone',
  
  // Skip build errors for now (remove this in production!)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
