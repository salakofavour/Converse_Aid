let cachedCSRFToken = null;

export async function getCSRFTokenFromAPI() {
  if (cachedCSRFToken) return cachedCSRFToken;
  const res = await fetch(`${window.location.origin}/api/csrf-token`, { credentials: 'same-origin' });
  const data = await res.json();
  cachedCSRFToken = data.csrfToken;
  return cachedCSRFToken;
}

export async function fetchWithCSRF(url, options = {}) {
  const csrfToken = await getCSRFTokenFromAPI();
  const headers = {
    ...(options.headers || {}),
    'x-csrf-token': csrfToken || '',
  };
  return fetch(url, {
    ...options,
    headers,
  });
}
  