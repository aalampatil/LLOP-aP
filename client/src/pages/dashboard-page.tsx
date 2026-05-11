import { Check, Clock, Download, Eye, Link2, Loader2, Lock, QrCode, RefreshCw, Send, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QuestionAnalytics } from "../components/polls/question-analytics";
import { CopyPublicLinkButton } from "../components/ui/copy-public-link-button";
import { usePollSocket } from "../hooks/use-poll-socket";
import { getApiError, useApiClient } from "../lib/api";
import { formatDate, publicPollUrl } from "../lib/poll-utils";
import { usePollStore } from "../store/poll-store";
import type { Analytics, Poll } from "../types/poll";

/* ─────────────────────────────────────────────
   Themed sub-components
───────────────────────────────────────────── */
function DbMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="db-metric">
      <div className="db-metric-label">{icon}{label}</div>
      <div className="db-metric-value">{value}</div>
    </div>
  );
}

function DbPreviewRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="db-preview-row">
      <span className="db-preview-label">{icon}{label}</span>
      <span className="db-preview-value">{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DashboardPage
───────────────────────────────────────────── */
export function DashboardPage() {
  const { pollId } = useParams();
  const navigate = useNavigate();
  const api = useApiClient();
  const { activePoll, analytics, setActive, setLoading, loading } = usePollStore();
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [exporting, setExporting] = useState(false);
  usePollSocket(activePoll?.id);

  useEffect(() => {
    if (!pollId) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await api.get<{ poll: Poll; analytics: Analytics }>(`/api/poll/${pollId}/analytics`);
        if (mounted) setActive(data.poll, data.analytics);
      } catch (err) {
        if (mounted) setError(getApiError(err, "Could not load dashboard"));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [api, pollId, setActive, setLoading]);

  const publish = async () => {
    if (!activePoll) return;
    setPublishing(true);
    setError("");
    try {
      const data = await api.post<{ poll: Poll; analytics: Analytics }>(`/api/poll/${activePoll.id}/publish`);
      setActive({ ...activePoll, ...data.poll }, data.analytics);
    } catch (err) {
      setError(getApiError(err, "Could not publish results"));
    } finally {
      setPublishing(false);
    }
  };

  const updateStatus = async (action: "close" | "reopen") => {
    if (!activePoll) return;
    setStatusChanging(true);
    setError("");
    try {
      const data = await api.post<{ poll: Poll; analytics: Analytics }>(
        `/api/poll/${activePoll.id}/${action}`,
      );
      setActive({ ...activePoll, ...data.poll }, data.analytics);
    } catch (err) {
      setError(getApiError(err, `Could not ${action} poll`));
    } finally {
      setStatusChanging(false);
    }
  };

  const exportCsv = async () => {
    if (!activePoll) return;
    setExporting(true);
    setError("");
    try {
      const blob = await api.download(`/api/poll/${activePoll.id}/export.csv`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activePoll.slug}-responses.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiError(err, "Could not export responses"));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <main className="db-root">
        <div className="db-layout db-center">
          <Loader2 size={32} className="db-spinner" />
        </div>
      </main>
    );
  }

  if (error || !activePoll || !analytics) {
    return (
      <main className="db-root">
        <div className="db-layout" style={{ paddingTop: "3rem" }}>
          <div className="db-error">⚠ {error || "Dashboard unavailable"}</div>
        </div>
      </main>
    );
  }

  const shareUrl = publicPollUrl(activePoll.slug);

  return (
    <main className="db-root">
      <div className="db-layout">

        {/* ── Page header ── */}
        <div className="db-page-head">
          <div>
            <div className="db-badge">
              <span className="db-badge-dot" />
              Analytics · Live creator workspace
            </div>
            <button className="db-back" onClick={() => navigate("/")} type="button">
              Back to workspace
            </button>
            <h1 className="db-title">{activePoll.title}</h1>
            <p className="db-desc">{activePoll.description}</p>
          </div>
          <div className="db-head-actions">
            <CopyPublicLinkButton url={shareUrl} className="db-btn db-btn-secondary" />
            <button
              className="db-btn db-btn-secondary"
              disabled={exporting}
              onClick={exportCsv}
              type="button"
            >
              {exporting ? <Loader2 size={14} className="db-spinner" /> : <Download size={14} />}
              Export CSV
            </button>
            {activePoll.status === "closed" ? (
              <button
                className="db-btn db-btn-secondary"
                disabled={statusChanging}
                onClick={() => updateStatus("reopen")}
                type="button"
              >
                {statusChanging ? <Loader2 size={14} className="db-spinner" /> : <RefreshCw size={14} />}
                Reopen
              </button>
            ) : (
              <button
                className="db-btn db-btn-secondary"
                disabled={statusChanging || activePoll.status === "published"}
                onClick={() => updateStatus("close")}
                type="button"
              >
                {statusChanging ? <Loader2 size={14} className="db-spinner" /> : <XCircle size={14} />}
                Close
              </button>
            )}
            <button
              className="db-btn db-btn-primary"
              disabled={publishing || activePoll.status === "published"}
              onClick={publish}
              type="button"
            >
              {publishing
                ? <Loader2 size={14} className="db-spinner" />
                : <Eye size={14} />}
              Publish results
            </button>
          </div>
        </div>

        {/* ── Metrics ── */}
        <div className="db-metrics">
          <DbMetric icon={<Send size={12} />} label="Responses" value={analytics.totalResponses.toString()} />
          <DbMetric icon={<Check size={12} />} label="Completion" value={`${analytics.completionRate}%`} />
          <DbMetric icon={<ShieldCheck size={12} />} label="Anonymous" value={analytics.anonymousResponses.toString()} />
          <DbMetric icon={<UserCheck size={12} />} label="Signed in" value={analytics.authenticatedResponses.toString()} />
        </div>

        {/* ── Main grid ── */}
        <div className="db-grid">

          {/* Questions */}
          <section className="db-questions">
            {analytics.questions.map((question) => (
              <QuestionAnalytics key={question.id} question={question} />
            ))}
          </section>

          {/* Sidebar */}
          <aside className="db-sidebar">
            <h2 className="db-sidebar-title">Share room</h2>
            <div className="db-url-box">{shareUrl}</div>
            <CopyPublicLinkButton url={shareUrl} className="db-btn db-btn-secondary" style={{ width: "100%", justifyContent: "center" }} />
            <div className="mt-4 rounded-md border border-border bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-black">
                <QrCode size={14} /> QR share
              </div>
              <img
                alt="Poll share QR code"
                className="mx-auto h-40 w-40"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`}
              />
            </div>
            <hr className="db-divider" />
            <DbPreviewRow icon={<Clock size={12} />} label="Expires" value={formatDate(activePoll.expiresAt)} />
            <DbPreviewRow icon={<Lock size={12} />} label="Mode" value={activePoll.isAnonymous ? "Anonymous" : "Authenticated"} />
            <DbPreviewRow icon={<Eye size={12} />} label="Public results" value={activePoll.status === "published" ? "Published" : "Hidden"} />
            <DbPreviewRow icon={<Link2 size={12} />} label="Slug" value={activePoll.slug} />
            <DbPreviewRow icon={<ShieldCheck size={12} />} label="Status" value={activePoll.status} />
          </aside>
        </div>

      </div>
    </main>
  );
}
