import { SignUpButton } from "@clerk/react";
import { Activity, Eye, Loader2, Plus, Rocket, Send, ShieldCheck, Sparkles, Vote, Zap } from "lucide-react";
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
  const visiblePolls = useMemo(() => {
    const query = search.trim().toLowerCase();
    return polls.filter((poll) => {
      const matchesSearch =
        !query ||
        poll.title.toLowerCase().includes(query) ||
        (poll.description ?? "").toLowerCase().includes(query) ||
        poll.category.toLowerCase().includes(query) ||
        poll.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || poll.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [polls, search, statusFilter]);

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
              Decision intelligence · Live workspace
            </div>

            <h1 className="hp-title">
              Launch polls like a{" "}
              <span className="hp-title-accent">command center.</span>
            </h1>

            <p className="hp-subtitle">
              Create high-signal polls, enforce clean participation,<br />
              and publish boardroom-ready outcomes — all in one place.
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
                <p className="hp-card-label">Live operations</p>
                <p className="hp-card-title">Poll Intelligence</p>
              </div>
              <div className="hp-card-icon">
                <Activity size={18} />
              </div>
            </div>

            <div className="hp-metrics">
              <ThemeMetric icon={<Vote size={12} />} label="Polls" value={polls.length.toString()} />
              <ThemeMetric icon={<Send size={12} />} label="Responses" value={totalResponses.toString()} />
              <ThemeMetric icon={<Sparkles size={12} />} label="Mode" value="Live" />
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
                Ship · Share · Monitor · Publish — without leaving this screen.
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
            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px]">
              <input
                className="neo-input"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search polls by title, description, category, or tag"
                type="search"
                value={search}
              />
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
