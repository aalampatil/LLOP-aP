import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { getApiError, useApiClient } from "../lib/api";
import type { CurrentUser } from "../types/poll";

export function useCurrentUser() {
  const api = useApiClient();
  const { isLoaded, isSignedIn } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!isLoaded) return;
      if (!isSignedIn) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await api.get<{ user: CurrentUser | null }>("/api/user/me");
        const currentUser = data.user;
        if (mounted) setUser(currentUser);
      } catch (err) {
        if (mounted) setError(getApiError(err, "Could not load user"));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [api, isLoaded, isSignedIn]);

  return {
    user,
    loading: loading || !isLoaded,
    error,
    isAdmin: user?.role === "admin",
  };
}
