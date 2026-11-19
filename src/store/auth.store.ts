import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/auth";
import { useCallStore } from "./call.store";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isBootstrapping: boolean;

  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  setBootstrapping: (value: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isBootstrapping: true,

      setSession: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      setAccessToken: (accessToken) => set({ accessToken }),

      updateUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : state.user,
        })),

      setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),

      clearSession: () => {
        useCallStore.getState().resetCallStore();
        useCallStore.getState().setActiveLead(null);
        // Clear dialer session authentication flags on logout
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith("dialer_auth_verified_")) {
            sessionStorage.removeItem(key);
          }
        });

        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: "crm-auth",
      // accessToken is intentionally excluded — memory only
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
