import { NextResponse } from 'next/server';

const TIMEOUT_MS = 5000;
const ENDPOINTS = [
  'https://www.google.com/generate_204',
  'https://www.cloudflare.com/cdn-cgi/trace',
  'https://www.apple.com/library/test/success.html'
];

async function checkEndpoint(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET() {
  try {
    // Try multiple endpoints in parallel
    const results = await Promise.all(
      ENDPOINTS.map(endpoint => checkEndpoint(endpoint))
    );

    // If any endpoint responds successfully, consider we have connectivity
    const hasConnection = results.some(result => result === true);

    if (hasConnection) {
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    throw new Error('All connectivity checks failed');
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'No internet connection' },
      { status: 503 }
    );
  }
} 