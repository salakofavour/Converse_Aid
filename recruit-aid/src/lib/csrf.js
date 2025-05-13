import { nanoid } from 'nanoid';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 64; // 64 chars, ~32 bytes of entropy

// Generate a secure random CSRF token
function createToken() {
  return nanoid(CSRF_TOKEN_LENGTH);
}

// Set the CSRF token as a secure, HTTP-only cookie
export function generateCSRFToken(res) {
  const token = createToken();
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',//if in production, then secure is true, else its false
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 2, // 2 hours
  });
  return token;
}

// Validate the CSRF token in the request
export async function validateCSRFToken(request) {
  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) {
    return 'Missing CSRF token in request header';
  }

  // Get token from cookie
  let cookieToken = null;
  if (request.cookies && typeof request.cookies.get === 'function') {
    // Next.js API Route Request
    cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  } else if (request.headers.get('cookie')) {
    // Edge API Route Request
    const cookies = request.headers.get('cookie').split(';').map(c => c.trim());
    for (const c of cookies) {
      if (c.startsWith(CSRF_COOKIE_NAME + '=')) {
        cookieToken = c.substring(CSRF_COOKIE_NAME.length + 1);
        break;
      }
    }
  }

  if (!cookieToken) {
    return 'Missing CSRF token cookie';
  }

  if (headerToken !== cookieToken) {
    return 'Invalid CSRF token';
  }

  return null; // Valid
} 