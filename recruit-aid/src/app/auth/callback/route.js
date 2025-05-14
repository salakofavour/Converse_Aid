import { generateCSRFToken } from '@/lib/csrf';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  console.log('Callback route called');
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  let response = NextResponse.redirect(new URL('/dashboard', request.url));

  if (code) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
    generateCSRFToken(response); // Rotate CSRF token on login
  }

  return response;
} 