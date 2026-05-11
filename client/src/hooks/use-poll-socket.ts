import { useEffect } from "react";
import { API_URL } from "../lib/api";
import { usePollStore } from "../store/poll-store";
import type { Analytics } from "../types/poll";

type SocketLike = {
  emit: (event: string, payload?: unknown) => void;
  on: (
    event: string,
    callback: (payload: { analytics?: Analytics; pollId?: string }) => void,
  ) => void;
  disconnect: () => void;
};

declare global {
  interface Window {
    io?: (url: string, options?: Record<string, unknown>) => SocketLike;
  }
}

export function usePollSocket(pollId?: string | null) {
  const setAnalytics = usePollStore((state) => state.setAnalytics);
  const setPollExpired = usePollStore((state) => state.setPollExpired);

  useEffect(() => {
    if (!pollId) return;

    let socket: SocketLike | null = null;
    let cancelled = false;

    const connect = () => {
      if (!window.io || cancelled) return;
      socket = window.io(API_URL, { transports: ["websocket", "polling"] });
      socket.emit("poll:join", pollId);
      socket.on("analytics:update", (payload) => {
        if (payload.analytics) setAnalytics(payload.analytics);
      });
      socket.on("poll:published", (payload) => {
        if (payload.analytics) setAnalytics(payload.analytics);
      });
      socket.on("poll:expired", (payload) => {
        if (payload.pollId) setPollExpired(payload.pollId);
      });
    };

    if (window.io) {
      connect();
    } else {
      const script = document.createElement("script");
      script.src = `${API_URL}/socket.io/socket.io.js`;
      script.async = true;
      script.onload = connect;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      socket?.emit("poll:leave", pollId);
      socket?.disconnect();
    };
  }, [pollId, setAnalytics, setPollExpired]);
}
