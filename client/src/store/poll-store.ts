import { create } from "zustand";
import type { Analytics, Poll, PollSummary, PublicState } from "../types/poll";

type PollStore = {
  polls: PollSummary[];
  activePoll: Poll | null;
  analytics: Analytics | null;
  publicPoll: Poll | null;
  publicState: PublicState | null;
  loading: boolean;
  setPolls: (polls: PollSummary[]) => void;
  setActive: (poll: Poll | null, analytics?: Analytics | null) => void;
  setPublic: (
    poll: Poll | null,
    state: PublicState | null,
    analytics?: Analytics | null,
  ) => void;
  setAnalytics: (analytics: Analytics | null) => void;
  setPollExpired: (pollId: string) => void;
  setLoading: (loading: boolean) => void;
};

export const usePollStore = create<PollStore>((set) => ({
  polls: [],
  activePoll: null,
  analytics: null,
  publicPoll: null,
  publicState: null,
  loading: false,
  setPolls: (polls) => set({ polls }),
  setActive: (poll, analytics = null) => set({ activePoll: poll, analytics }),
  setPublic: (poll, state, analytics = null) =>
    set({ publicPoll: poll, publicState: state, analytics }),
  setAnalytics: (analytics) => set({ analytics }),
  setPollExpired: (pollId) =>
    set((state) => ({
      activePoll:
        state.activePoll?.id === pollId
          ? { ...state.activePoll, status: "expired" }
          : state.activePoll,
      publicPoll:
        state.publicPoll?.id === pollId
          ? { ...state.publicPoll, status: "expired" }
          : state.publicPoll,
      publicState:
        state.publicPoll?.id === pollId && state.publicState
          ? {
              ...state.publicState,
              expired: true,
              acceptingResponses: false,
            }
          : state.publicState,
    })),
  setLoading: (loading) => set({ loading }),
}));
