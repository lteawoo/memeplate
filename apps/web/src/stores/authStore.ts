import { create } from 'zustand';
import { apiFetch, fetchAuthMeWithRefresh } from '../lib/apiFetch';

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

type AuthMeResponse = {
  authenticated: boolean;
  user?: AuthUser;
};

type AuthStoreState = {
  user: AuthUser | null;
  isLoading: boolean;
  initialized: boolean;
  syncSession: () => Promise<void>;
  logout: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<AuthUser>;
};

let syncInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isLoading: false,
  initialized: false,
  syncSession: async () => {
    if (syncInFlight) return syncInFlight;

    syncInFlight = (async () => {
      set({ isLoading: true });
      try {
        const payload = await fetchAuthMeWithRefresh();
        set({
          user: payload.authenticated && payload.user ? payload.user : null,
          initialized: true
        });
      } catch {
        set({ user: null, initialized: true });
      } finally {
        set({ isLoading: false });
      }
    })();

    try {
      await syncInFlight;
    } finally {
      syncInFlight = null;
    }
  },
  logout: async () => {
    try {
      await apiFetch('/api/v1/auth/logout', {
        method: 'POST'
      }, { retryOnUnauthorized: false, redirectOnAuthFailure: false });
    } finally {
      set({ user: null, initialized: true });
    }
  },
  updateDisplayName: async (displayName) => {
    const res = await apiFetch('/api/v1/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName })
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(payload.message || '내 정보 저장에 실패했습니다.');
    }

    const payload = (await res.json()) as AuthMeResponse;
    if (!payload.authenticated || !payload.user) {
      throw new Error('인증 세션이 만료되었습니다.');
    }

    set({ user: payload.user, initialized: true });
    return payload.user;
  }
}));

export const ensureAuthSession = async () => {
  const state = useAuthStore.getState();
  if (state.initialized && !state.isLoading) return;
  await state.syncSession();
};

export const getAuthUser = () => useAuthStore.getState().user;
