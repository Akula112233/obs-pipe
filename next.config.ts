import type { NextConfig } from 'next'
import type { Configuration as WebpackConfig } from 'webpack'

const config: NextConfig = {
  webpack: (config: WebpackConfig, { isServer }) => {
    config.module = config.module || { rules: [] };
    config.module.rules = config.module.rules || [];
    
    config.module.rules.push({
      test: /\.ya?ml$/,
      use: 'yaml-loader',
    });

    // Handle native modules
    if (isServer) {
      config.externals = [...(Array.isArray(config.externals) ? config.externals : []), 'ssh2'];
    }

    // Add node-loader for native modules
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    return config;
  },
  
  // Add Turbopack configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  output: 'standalone',
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return []
    // return [
    //   // Main app routes
    //   {
    //     source: '/view-logs',
    //     destination: 'http://signoz-frontend:3301',
    //   },
    //   // Static assets and sub-routes
    //   {
    //     source: '/view-logs/:path*',
    //     destination: 'http://signoz-frontend:3301/:path*',
    //   },
    //   // API routes
    //   {
    //     source: '/api/:path*',
    //     destination: 'http://signoz-frontend:3301/api/:path*',
    //   },
    //   // WebSocket support
    //   {
    //     source: '/ws',
    //     destination: 'http://signoz-frontend:3301/ws',
    //   },
    //   // Static assets with base URL rewrite
    //   {
    //     source: '/static/:path*',
    //     destination: 'http://signoz-frontend:3301/static/:path*',
    //   },
    //   {
    //     source: '/assets/:path*',
    //     destination: 'http://signoz-frontend:3301/assets/:path*',
    //   },
    //   // Handle root-level assets
    //   {
    //     source: '/:file((?!api|ws|view-logs|_next).*)',
    //     destination: 'http://signoz-frontend:3301/:file',
    //   }
    // ]
  },
  // Add headers to handle permissions policy warnings
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'browsing-topics=(), private-state-token-redemption=(), private-state-token-issuance=()'
          }
        ]
      },
      {
        // Add CORS headers for static files
        source: '/_next/static/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      },
      {
        // Add CORS headers for SVG files
        source: '/:path*.svg',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      },
      {
        // Add CORS headers for font files
        source: '/:path*.woff2',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      }
    ]
  }
}

export default config