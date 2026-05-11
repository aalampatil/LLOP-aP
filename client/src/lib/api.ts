import axios from "axios";
import { useAuth } from "@clerk/react";
import { useMemo } from "react";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function useApiClient() {
  const { getToken } = useAuth();

  return useMemo(
    () => ({
      async get<T>(path: string) {
        const token = await getToken();
        const response = await api.get<T>(path, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return response.data;
      },
      async post<T>(path: string, body?: unknown) {
        const token = await getToken();
        const response = await api.post<T>(path, body ?? {}, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return response.data;
      },
      async download(path: string) {
        const token = await getToken();
        const response = await api.get<Blob>(path, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          responseType: "blob",
        });
        return response.data;
      },
    }),
    [getToken],
  );
}

export function getApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
