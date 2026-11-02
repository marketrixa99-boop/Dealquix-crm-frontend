import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Isolated instance for refresh calls so they never re-enter the
// response interceptor below (would cause infinite refresh loops).
const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const flushQueue = (error: unknown, token: string | null) => {
  pendingQueue.forEach(({ resolve, reject }) =>
    error || !token ? reject(error) : resolve(token)
  );
  pendingQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login");

    if (!shouldAttemptRefresh) {
      return Promise.reject(error);
    }

    const { refreshToken, user, setSession, clearSession } =
      useAuthStore.getState();

    if (!refreshToken || !user) {
      clearSession();
      return Promise.reject(error);
    }

    originalRequest!._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            originalRequest!.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest!));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await refreshClient.post("/auth/refresh", {
        refreshToken,
      });
      const { accessToken, refreshToken: newRefreshToken } = data.data;

      setSession(user, accessToken, newRefreshToken);
      flushQueue(null, accessToken);

      originalRequest!.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest!);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      // Temporary failures must preserve the session so a later request can refresh.
      const status = axios.isAxiosError(refreshError)
        ? refreshError.response?.status
        : undefined;
      if (status === 401) {
        clearSession();
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);