import { Check, Download, Eye, Loader2, RefreshCw, Send, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardMetric } from "../components/dashboard/dashboard-metric";
import { DashboardSidebar } from "../components/dashboard/dashboard-sidebar";
import { IndividualResponses } from "../components/dashboard/individual-responses";
import { QuestionAnalytics } from "../components/polls/question-analytics";
import { CopyPublicLinkButton } from "../components/ui/copy-public-link-button";
import { usePollSocket } from "../hooks/use-poll-socket";
import { getApiError, useApiClient } from "../lib/api";
import { publicPollUrl } from "../lib/poll-utils";
import { usePollStore } from "../store/poll-store";
import type { Analytics, Poll, ResponseDetail } from "../types/poll";

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
  const [responses, setResponses] = useState<ResponseDetail[]>([]);
  usePollSocket(activePoll?.id);

  useEffect(() => {
    if (!pollId) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [data, responseData] = await Promise.all([
          api.get<{ poll: Poll; analytics: Analytics }>(`/api/poll/${pollId}/analytics`),
          api.get<{ responses: ResponseDetail[] }>(`/api/poll/${pollId}/responses`),
        ]);
        if (mounted) {
          setActive(data.poll, data.analytics);
          setResponses(responseData.responses);
        }
      } catch (err) {
        if (mounted) setError(getApiError(err, "Could not load dashboard"));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [api, pollId, setActive, setLoading]);

  useEffect(() => {
    if (!activePoll || !analytics) return;
    if (responses.length === analytics.totalResponses) return;

    let mounted = true;
    api
      .get<{ responses: ResponseDetail[] }>(`/api/poll/${activePoll.id}/responses`)
      .then((responseData) => {
        if (mounted) setResponses(responseData.responses);
      })
      .catch((err) => {
        if (mounted) setError(getApiError(err, "Could not refresh responses"));
      });

    return () => {
      mounted = false;
    };
  }, [activePoll, analytics, api, responses.length]);

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

  const downloadQr = async () => {
    if (!activePoll) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=640x640&data=${encodeURIComponent(shareUrl)}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activePoll.slug}-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(qrUrl, "_blank");
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
          <DashboardMetric icon={<Send size={12} />} label="Responses" value={analytics.totalResponses.toString()} />
          <DashboardMetric icon={<Check size={12} />} label="Completion" value={`${analytics.completionRate}%`} />
          <DashboardMetric icon={<ShieldCheck size={12} />} label="Anonymous" value={analytics.anonymousResponses.toString()} />
          <DashboardMetric icon={<UserCheck size={12} />} label="Signed in" value={analytics.authenticatedResponses.toString()} />
        </div>

        {/* ── Main grid ── */}
        <div className="db-grid">

          {/* Questions */}
          <section className="db-questions">
            {analytics.questions.map((question) => (
              <QuestionAnalytics key={question.id} question={question} />
            ))}
            <IndividualResponses responses={responses} />
          </section>

          {/* Sidebar */}
          <DashboardSidebar poll={activePoll} shareUrl={shareUrl} downloadQr={downloadQr} />
        </div>

      </div>
    </main>
  );
}
