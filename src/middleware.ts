import { createServerComponentClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of paths that require authentication
const PROTECTED_PATHS = [
  '/',
  '/config',
];

// List of paths that are public
const PUBLIC_PATHS = [
  '/auth/callback',
  '/auth/auth-code-error',
  '/auth/complete-profile',
  '/about',
  '/troubleshoot',
  '/api/vector/preview-logs',
];

// List of auth paths that should redirect to home if logged in
const AUTH_PATHS = [
  '/auth/signin',
  '/auth/signup'
];

export async function middleware(request: NextRequest) {
  // Handle OPTIONS requests for CORS preflight
  if (request.method === 'OPTIONS') {
    // Return a 200 OK response with appropriate CORS headers
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    });
  }

  // Create a response object that we'll use to handle the response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create a Supabase client
  const supabase = await createServerComponentClient();

  // Get the pathname from the URL
  const pathname = request.nextUrl.pathname;

  // Add the pathname to the x-pathname header for use in layout
  response.headers.set('x-pathname', pathname);

  // Check if the path requires authentication
  const requiresAuth = PROTECTED_PATHS.some(path => pathname === path);
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path);
  const isAuthPath = AUTH_PATHS.some(path => pathname === path);

  try {
    // Get the session
    const { data: { session } } = await supabase.auth.getSession();

    // If there's a session and we're on an auth path, redirect to home
    if (session && isAuthPath) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // If it's a public path, allow access
    if (isPublicPath) {
      return response;
    }

    // If the path requires auth and there's no session, redirect to login
    if (requiresAuth && !session) {
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // For authenticated paths, check organization membership
    if (session && requiresAuth) {
      try {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (memberError || !member) {
          console.error('Middleware: No organization membership found', {
            userId: session.user.id,
            error: memberError
          });
          
          // Sign out the user and redirect to sign up
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL('/auth/signup', request.url));
        }
      } catch (error) {
        console.error('Middleware: Organization check error', error);
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }
    } 

    // Add CORS headers for static files
    if (request.nextUrl.pathname.startsWith('/_next/static/') ||
        request.nextUrl.pathname.endsWith('.svg') ||
        request.nextUrl.pathname.endsWith('.woff2')) {
      
      // Add CORS headers to the response
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      // For OPTIONS requests, return 200 OK with headers only
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 200,
          headers: response.headers,
        })
      }
    }

    return response;
  } catch (e) {
    console.error('Middleware error:', e);
    // If there's an error checking the session, redirect to login for protected paths
    if (requiresAuth) {
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 