import { NextResponse } from 'next/server';

export async function GET(request) {
  let csrfToken = null;
  if (request.cookies && typeof request.cookies.get === 'function') {
    csrfToken = request.cookies.get('csrf_token')?.value || null;
  } else if (request.headers.get('cookie')) {
    // Edge API Route
    const cookies = request.headers.get('cookie').split(';').map(c => c.trim());
    for (const c of cookies) {
      if (c.startsWith('csrf_token=')) {
        csrfToken = c.substring('csrf_token='.length);
        break;
      }
    }
  }
  return NextResponse.json({ csrfToken });
} 