import { SignUpButton } from "@clerk/react";
import {
  Activity,
  ArrowDownAZ,
  Eye,
  Loader2,
  Plus,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Vote,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignedInView, SignedOutView } from "../components/auth/auth-views";
import { AuthWall } from "../components/home/auth-wall";
import { EmptyState } from "../components/home/empty-state";
import { PollCard } from "../components/polls/poll-card";
import { getApiError, useApiClient } from "../lib/api";
import { usePollStore } from "../store/poll-store";
import type { PollSummary } from "../types/poll";

/* ─────────────────────────────────────────────
   Sub-components (inline, theme-matched)
───────────────────────────────────────────── */
function ThemeMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="hp-metric">
      <div className="hp-metric-label">
        {icon}
        {label}
      </div>
      <div className="hp-metric-value">{value}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HomePage
───────────────────────────────────────────── */
export function HomePage() {
  const api = useApiClient();
  const navigate = useNavigate();
  const { polls, setPolls, loading, setLoading } = usePollStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await api.get<{ polls: PollSummary[] }>("/api/poll");
        if (active) setPolls(data.polls);
      } catch (error) {
        console.warn(getApiError(error, "Could not load polls"));
        if (active) setPolls([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [api, setLoading, setPolls]);

  useEffect(() => {
    if (window.location.hash === "#workspace") {
      document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const totalResponses = polls.reduce((sum, poll) => sum + poll.analytics.totalResponses, 0);
  const activePolls = polls.filter((poll) => poll.status === "active").length;
  const publishedPolls = polls.filter((poll) => poll.status === "published").length;
  const visiblePolls = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = polls.filter((poll) => {
      const matchesSearch =
        !query ||
        poll.title.toLowerCase().includes(query) ||
        (poll.description ?? "").toLowerCase().includes(query) ||
        poll.category.toLowerCase().includes(query) ||
        poll.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || poll.status === statusFilter;
      const matchesMode =
        modeFilter === "all" ||
        (modeFilter === "anonymous" && poll.isAnonymous) ||
        (modeFilter === "authenticated" && !poll.isAnonymous);
      return matchesSearch && matchesStatus && matchesMode;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "responses") {
        return b.analytics.totalResponses - a.analytics.totalResponses;
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [modeFilter, polls, search, sortBy, statusFilter]);

  const hasWorkspaceFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    modeFilter !== "all" ||
    sortBy !== "newest";

  const resetWorkspaceFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setModeFilter("all");
    setSortBy("newest");
  };

  const scrollToWorkspace = () =>
    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="hp-root">
      <div className="hp-layout">

        {/* ── Hero ── */}
        <section className="hp-hero">

          {/* Left column */}
          <div>
            <div className="hp-badge">
              <span className="hp-badge-dot" />
              Live polls · Clear results
            </div>

            <h1 className="hp-title">
              Create polls that{" "}
              <span className="hp-title-accent">get answers fast.</span>
            </h1>

            <p className="hp-subtitle">
              Build, share, and track polls with live results,<br />
              response controls, and simple publishing.
            </p>

            <div className="hp-btn-row">
              <SignedInView>
                <button
                  className="hp-btn hp-btn-primary"
                  onClick={() => navigate("/builder")}
                  type="button"
                >
                  <Rocket size={15} /> Create poll
                </button>
              </SignedInView>
              <SignedOutView>
                <SignUpButton mode="modal">
                  <button className="hp-btn hp-btn-primary" type="button">
                    <Rocket size={15} /> Create poll
                  </button>
                </SignUpButton>
              </SignedOutView>
              <button
                className="hp-btn hp-btn-secondary"
                onClick={scrollToWorkspace}
                type="button"
              >
                <Eye size={15} /> View workspace
              </button>
            </div>

            <div className="hp-strip">
              <span>
                <ShieldCheck size={10} style={{ display: "inline", marginRight: 4 }} />
                Clerk secured
              </span>
              <span>Realtime analytics</span>
              <span>One response per user</span>
            </div>
          </div>

          {/* Right column — live card */}
          <div className="hp-card">
            <div className="hp-card-header">
              <div>
                <p className="hp-card-label">Live overview</p>
                <p className="hp-card-title">Poll Analytics</p>
              </div>
              <div className="hp-card-icon">
                <Activity size={18} />
              </div>
            </div>

            <div className="hp-metrics">
              <ThemeMetric icon={<Vote size={12} />} label="Polls" value={polls.length.toString()} />
              <ThemeMetric icon={<Send size={12} />} label="Responses" value={totalResponses.toString()} />
              <ThemeMetric icon={<Sparkles size={12} />} label="Active" value={activePolls.toString()} />
            </div>

            <div className="hp-analytics">
              <div className="hp-analytics-header">
                <span className="hp-analytics-title">Live analytics</span>
                <span className="hp-pill">
                  <Zap size={10} /> real time
                </span>
              </div>
              {["Product direction", "Launch name", "Pricing signal"].map((item, i) => (
                <div className="hp-bar-row" key={item}>
                  <div className="hp-bar-label">
                    <span>{item}</span>
                    <span>{82 - i * 17}%</span>
                  </div>
                  <div className="hp-bar-track">
                    <div className="hp-bar-fill" style={{ width: `${82 - i * 17}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Workspace section ── */}
        <section id="workspace" className="hp-section">
          <div className="hp-section-header">
            <div>
              <p className="hp-section-kicker">
                <span className="hp-badge-dot" style={{ display: "inline-block", marginRight: 6 }} />
                Active workspace
              </p>
              <h2 className="hp-section-title">Creator workspace</h2>
              <p className="hp-section-sub">
                Create, share, review, and publish your polls from one place.
              </p>
            </div>
            <SignedInView>
              <button
                className="hp-btn hp-btn-primary"
                onClick={() => navigate("/builder")}
                type="button"
              >
                <Plus size={14} /> New poll
              </button>
            </SignedInView>
          </div>

          <SignedInView>
            <div className="neo-panel p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
                  <SlidersHorizontal size={14} />
                  Workspace controls
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  <span className="premium-badge">{visiblePolls.length} shown</span>
                  <span>{activePolls} active</span>
                  <span>{publishedPolls} published</span>
                  {hasWorkspaceFilters ? (
                    <button
                      className="text-main"
                      onClick={resetWorkspaceFilters}
                      type="button"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_180px_210px_190px]">
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    className="neo-input pl-10"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, description, category, or tag"
                    type="search"
                    value={search}
                  />
                </label>
                <select
                  className="neo-input"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="expired">Expired</option>
                  <option value="published">Published</option>
                </select>
                <select
                  className="neo-input"
                  onChange={(event) => setModeFilter(event.target.value)}
                  value={modeFilter}
                >
                  <option value="all">All response modes</option>
                  <option value="anonymous">Anonymous only</option>
                  <option value="authenticated">Authenticated only</option>
                </select>
                <label className="relative block">
                  <ArrowDownAZ
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <select
                    className="neo-input pl-10"
                    onChange={(event) => setSortBy(event.target.value)}
                    value={sortBy}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="responses">Most responses</option>
                    <option value="title">Title A-Z</option>
                  </select>
                </label>
              </div>
            </div>
          </SignedInView>

          <SignedOutView>
            <AuthWall />
          </SignedOutView>

          <SignedInView>
            {loading ? (
              <div className="hp-panel">
                <Loader2 size={28} className="hp-spinner" />
              </div>
            ) : polls.length === 0 ? (
              <EmptyState />
            ) : visiblePolls.length === 0 ? (
              <div className="hp-panel">
                <p className="font-black">No polls match your filters.</p>
              </div>
            ) : (
              <div className="hp-poll-grid">
                {visiblePolls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
          </SignedInView>
        </section>

        {/* ── Footer ── */}
        <footer className="hp-footer">
          Updates broadcast via Socket.io &nbsp;·&nbsp; Realtime analytics &nbsp;·&nbsp; Clerk auth
        </footer>

      </div>
    </main>
  );
}
