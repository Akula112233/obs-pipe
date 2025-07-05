const isProd = process.env.NODE_ENV === 'production';

export const envConfig = {
  // In production, use the Cloud Run service name, in dev use localhost
  appHost: isProd ? 'app-nextjs-1' : 'localhost',
  appPort: isProd ? '3000' : '3000',
  
  // Vector health check endpoint base (for local development)
  vectorHealthEndpoint: isProd ? null : 'localhost',
  
  // Vector port in production
  vectorProdPort: 8686,
  
  // Preview logs endpoint (used in Vector config)
  previewLogsEndpoint: isProd 
    ? 'http://app-nextjs-1:3000/api/vector/preview-logs'
    : 'http://localhost:3000/api/vector/preview-logs',
    
  // Signoz dashboard URL
  signozUrl: isProd
    ? process.env.NEXT_PUBLIC_SIGNOZ_URL || '/view-logs'  // In prod, use env var or default to /signoz
    : 'http://localhost:3301'  // In dev, direct port access
} as const; 