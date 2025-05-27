import { generateCSRFToken } from '@/lib/csrf';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient (
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value, options));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createSupabaseServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, ensure CSRF token cookie is set
  if (user) {
    const csrfCookie = request.cookies.getAll().find(c => c.name === 'csrf_token');
    if (!csrfCookie) {
      generateCSRFToken(supabaseResponse); // Set CSRF token cookie
    }
  }

  // If user is not signed in and the current path is not / or /signin or /signup (has code and uses /api/auth -> i need both these check to pass sign in & up, I also need the code one to pass the gmail response of adding a sender email)
  // redirect the user to /
  if (!user && 
      !request.nextUrl.pathname.includes('/api/auth') && 
      !request.nextUrl.searchParams.has('code') && 
      request.nextUrl.pathname !== '/' && 
      request.nextUrl.pathname !== '/signin' && 
      request.nextUrl.pathname !== '/signup' &&
      request.nextUrl.pathname !== '/terms' &&
      request.nextUrl.pathname !== '/privacy' &&
      request.nextUrl.pathname !== '/pricing-contact'
    ){
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user is signed in and the current path is /, /signin or /signup
  // redirect the user to /dashboard
  if (user && 
      (request.nextUrl.pathname === '/' || 
       request.nextUrl.pathname === '/signin' || 
       request.nextUrl.pathname === '/signup')
    ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhooks/stripe (Stripe webhook endpoint)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks/stripe|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 