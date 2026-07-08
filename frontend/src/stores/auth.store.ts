import { defineStore } from 'pinia';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';
import { ref } from 'vue';
import type { User } from '../types';

export const useAuthStore = defineStore('auth', () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  // The JWT now lives in an HttpOnly cookie — JS never touches it.
  // We only keep the user profile in memory (re-hydrated via /me on page load).
  const user = ref<User | null>(null);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const setAuth = (newUser: User) => {
    user.value = newUser;
    initSocket();
  };

  const login = async (credentials: Record<string, unknown>) => {
    const res = await api.post('/auth/login', credentials);
    // Token is set server-side as an HttpOnly cookie — we only store the user
    setAuth(res.data.data.user);
  };

  const register = async (data: Record<string, unknown>) => {
    const res = await api.post('/auth/register', data);
    setAuth(res.data.data.user);
  };

  /**
   * Clears the HttpOnly cookies server-side and wipes local state.
   * HttpOnly cookies can only be cleared by the server, so we always hit
   * the logout endpoint. Navigation to /login is the caller's responsibility.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the request fails, clear the client-side state
    } finally {
      user.value = null;
      disconnectSocket();
    }
  };

  /**
   * Called once on app mount to re-hydrate the user from the existing
   * access_token cookie (survives page refreshes without localStorage).
   */
  const initAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      user.value = res.data.data.user;
      initSocket();
    } catch {
      user.value = null;
    }
  };

  return { user, login, register, logout, setAuth, initAuth };
});
