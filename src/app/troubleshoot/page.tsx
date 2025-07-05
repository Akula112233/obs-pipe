'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface EndpointStatus {
  url: string;
  status: 'checking' | 'success' | 'error';
  error?: string;
}

const REQUIRED_ENDPOINTS = [
  {
    url: 'https://raw.githubusercontent.com',
    description: 'GitHub Raw Content (Required for system announcements and updates)',
    example: 'raw.githubusercontent.com'
  },
  {
    url: 'https://api.github.com',
    description: 'GitHub API (Required for system status checks)',
    example: 'api.github.com'
  },
  {
    url: 'https://www.google.com/generate_204',
    description: 'Google Connectivity Check (Required for internet connectivity verification)',
    example: 'www.google.com'
  },
  {
    url: 'https://www.cloudflare.com/cdn-cgi/trace',
    description: 'Cloudflare Connectivity Check (Required for internet connectivity verification)',
    example: 'www.cloudflare.com'
  },
  {
    url: 'https://www.apple.com/library/test/success.html',
    description: 'Apple Connectivity Check (Required for internet connectivity verification)',
    example: 'www.apple.com'
  }
];

export default function TroubleshootPage() {
  const [endpointStatuses, setEndpointStatuses] = useState<EndpointStatus[]>(
    REQUIRED_ENDPOINTS.map(endpoint => ({
      url: endpoint.url,
      status: 'checking'
    }))
  );

  useEffect(() => {
    const checkEndpoint = async (url: string) => {
      try {
        const response = await fetch('/api/check-endpoint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url })
        });
        
        if (response.ok) {
          return { status: 'success' as const };
        }
        const data = await response.json();
        return { status: 'error' as const, error: data.error };
      } catch (error) {
        return { 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    };

    const checkAllEndpoints = async () => {
      const checks = REQUIRED_ENDPOINTS.map(async (endpoint) => {
        const result = await checkEndpoint(endpoint.url);
        return {
          url: endpoint.url,
          ...result
        };
      });

      const results = await Promise.all(checks);
      setEndpointStatuses(results);
    };

    checkAllEndpoints();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </Link>
        <h1 className="text-3xl font-bold mb-4">Connectivity Troubleshooting</h1>
        <p className="text-gray-600 mb-8">
          This page helps diagnose connectivity issues with required services.
          If you're experiencing problems, ensure these endpoints are accessible from your network.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Required Endpoints</h2>
          <div className="space-y-4">
            {REQUIRED_ENDPOINTS.map((endpoint, index) => {
              const status = endpointStatuses[index];
              return (
                <div
                  key={endpoint.url}
                  className="bg-white rounded-lg border p-4 flex items-start gap-4"
                >
                  {status?.status === 'checking' && (
                    <AlertCircle className="h-6 w-6 text-yellow-500 shrink-0 mt-1" />
                  )}
                  {status?.status === 'success' && (
                    <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-1" />
                  )}
                  {status?.status === 'error' && (
                    <XCircle className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{endpoint.description}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Domain to whitelist: <code className="bg-gray-100 px-2 py-1 rounded">{endpoint.example}</code>
                    </p>
                    {status?.status === 'error' && (
                      <p className="text-sm text-red-600 mt-2">{status.error}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Common Issues</h2>
          <div className="bg-white rounded-lg border p-6 space-y-6">
            <div>
              <h3 className="font-medium mb-2">Firewall Configuration</h3>
              <p className="text-gray-600">
                If you're behind a corporate firewall, ensure the domains listed above are whitelisted.
                Both HTTPS (port 443) access is required for these domains.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Proxy Settings</h3>
              <p className="text-gray-600">
                If your organization uses a proxy server, make sure it's properly configured in your system
                and that it allows access to the required endpoints.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">DNS Issues</h3>
              <p className="text-gray-600">
                If you can't connect but the domains are whitelisted, try:
              </p>
              <ul className="list-disc ml-6 mt-2 text-gray-600">
                <li>Clearing your DNS cache</li>
                <li>Using a different DNS server (e.g., 8.8.8.8 or 1.1.1.1)</li>
                <li>Checking if your DNS server can resolve the required domains</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="text-sm text-gray-600">
          <p>
            Still having issues? Contact our support team at{' '}
            <a href="mailto:support@trysift.dev" className="text-blue-600 hover:underline">
              support@trysift.dev
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 