// Client-side API helpers: token storage + authenticated fetch wrappers.
// Admin tokens live in sessionStorage (cleared when the tab closes);
// member tokens live in localStorage (30-day sessions across visits).

const ADMIN_TOKEN_KEY = 'zentriva_admin_token';
const MEMBER_TOKEN_KEY = 'zentriva_member_token';

export const getAdminToken = () => sessionStorage.getItem(ADMIN_TOKEN_KEY);
export const setAdminToken = (token) => sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
export const clearAdminToken = () => sessionStorage.removeItem(ADMIN_TOKEN_KEY);

export const getMemberToken = () => {
  try {
    return localStorage.getItem(MEMBER_TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setMemberToken = (token) => {
  try {
    localStorage.setItem(MEMBER_TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private browsing) — session just won't persist.
  }
};
export const clearMemberToken = () => {
  try {
    localStorage.removeItem(MEMBER_TOKEN_KEY);
  } catch {
    // Ignore.
  }
};

// fetch() with a Bearer token attached. Throws on non-2xx with the server's
// error message; the thrown error carries .status so callers can detect 401.
async function authedFetch(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const adminApi = (url, options) => authedFetch(url, getAdminToken(), options);
export const memberApi = (url, options) => authedFetch(url, getMemberToken(), options);
export const publicApi = (url, options) => authedFetch(url, null, options);
