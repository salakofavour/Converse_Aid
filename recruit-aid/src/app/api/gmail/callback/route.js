import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // If there's an error or the user denied access
  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/settings?error=${error}`, request.url));
  }
  
  // If code and state are present, redirect to the settings page with the parameters
  if (code && state) {
    return NextResponse.redirect(new URL(`/dashboard/settings?code=${code}&state=${state}`, request.url));
  }
  
  // If something went wrong, redirect to the settings page with an error
  return NextResponse.redirect(new URL('/dashboard/settings?error=callback_failed', request.url));
} 