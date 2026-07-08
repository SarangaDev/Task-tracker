import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

/**
 * Reads a single cookie value by name from document.cookie.
 * Returns undefined if the cookie doesn't exist.
 */
const getCookie = (name: string): string | undefined => {
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
};

const api = axios.create({
  baseURL: '/api',
  // withCredentials ensures cookies (access_token, csrf_token) are sent
  // automatically with every request — no manual token management needed.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor — attach CSRF token ──────────────────────────────────
// State-mutating requests (POST/PUT/PATCH/DELETE) carry the X-CSRF-Token header
// read from the readable csrf_token cookie.  The backend validates that the
// header matches the HttpOnly access_token's paired csrf_token cookie —
// an attacker's site cannot forge this because they can't read your cookies.
api.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrf_token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// ─── Response interceptor — handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore();
      // Await logout so the server clears the cookie before we redirect
      await authStore.logout();
      // Use window.location to avoid importing the router (circular dep risk)
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
