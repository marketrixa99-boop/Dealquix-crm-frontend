import axios from "axios";
import { useEffect, useRef, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth.store";
import { apiClient } from "@/services/apiClient";
import { authApi } from "@/services/authApi";

export default function AuthBootstrap({ children }: { children: ReactNode }) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const bootstrap = async () => {
      const { refreshToken, setSession, clearSession, setBootstrapping } =
        useAuthStore.getState();

      if (!refreshToken) {
        clearSession();
        setBootstrapping(false);
        return;
      }

      try {
        const { data } = await apiClient.post("/auth/refresh", {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        // set token first so the /me call below is authorized
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          setSession(currentUser, accessToken, newRefreshToken);
        } else {
          useAuthStore.getState().setAccessToken(accessToken);
        }

        const user = await authApi.me();
        setSession(user, accessToken, newRefreshToken);
      } catch (error) {
        // Preserve the session on rate limits, network errors, and server outages.
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          clearSession();
        }
      } finally {
        setBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  return <>{children}</>;
}