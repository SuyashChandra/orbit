import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDTO } from '@orbit/shared';

interface AuthState {
  accessToken: string | null;
  user: UserDTO | null;
  setAccessToken: (token: string) => void;
  setUser: (user: UserDTO) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'orbit-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
