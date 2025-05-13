import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const scope = searchParams.get('scope');
  
  console.log('Gmail callback received:', {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error,
    scope,
    fullUrl: request.url
  });
  
  // If there's an error or the user denied access
  if (error) {
    console.error('Gmail auth callback error:', { error, state });
    return NextResponse.redirect(new URL(`/dashboard/settings?error=${error}`, request.url));
  }
  
  // If code and state are present, redirect to the settings page with the parameters
  if (code && state) {
    try {
      // Decode state to verify it's valid
      const decodedState = JSON.parse(atob(state));
      console.log('Gmail auth callback success:', { 
        code: code.substring(0, 10) + '...', // Log partial code for security
        state: decodedState,
        scope
      });
      return NextResponse.redirect(new URL(`/dashboard/settings?code=${code}&state=${state}`, request.url));
    } catch (err) {
      console.error('Error decoding state:', err);
      return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_state', request.url));
    }
  }
  
  // If something went wrong, redirect to the settings page with an error
  console.error('Gmail auth callback failed - missing required parameters:', { 
    hasCode: !!code, 
    hasState: !!state 
  });
  return NextResponse.redirect(new URL('/dashboard/settings?error=callback_failed', request.url));
} 