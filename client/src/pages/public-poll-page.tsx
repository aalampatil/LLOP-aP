import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ResultsPanel } from "../components/polls/results-panel";
import { AuthRequiredPanel } from "../components/public-poll/auth-required-panel";
import { PollStatusPanel } from "../components/public-poll/poll-status-panel";
import { PublicPollHeader } from "../components/public-poll/public-poll-header";
import { ResponseForm } from "../components/public-poll/response-form";
import { usePublicPoll } from "../hooks/use-public-poll";

/* ─────────────────────────────────────────────
   PublicPollPage
───────────────────────────────────────────── */
export function PublicPollPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const poll = usePublicPoll(slug);

  if (poll.loading) {
    return (
      <main className="pp-root">
        <div className="pp-layout pp-center">
          <Loader2 size={32} className="pp-spinner" />
        </div>
      </main>
    );
  }

  if (poll.error && !poll.publicPoll) {
    return (
      <main className="pp-root">
        <div className="pp-layout" style={{ paddingTop: "3rem" }}>
          <div className="pp-error">{poll.error}</div>
        </div>
      </main>
    );
  }

  if (!poll.publicPoll || !poll.publicState) return null;

  return (
    <main className="pp-root">
      <div className="pp-layout">

        {/* Header — rendered by PublicPollHeader; wrap gives it animation context */}
        <div style={{ animation: "pp-fadeUp .45s ease both" }}>
          <PublicPollHeader poll={poll.publicPoll} state={poll.publicState} />
        </div>

        {/* ── Conditional body ── */}
        {poll.publicPoll.status === "published" ? (
          <div style={{ animation: "pp-fadeUp .5s ease both .1s" }}>
            <ResultsPanel analytics={poll.analytics} title="Final results" />
          </div>
        ) : poll.publicState.expired ? (
          <div className="pp-warn">
            <div className="pp-warn-label">◎ Poll expired</div>
            This poll has expired. Results will appear here after the creator publishes them.
          </div>
        ) : !poll.publicState.acceptingResponses ? (
          <div className="pp-warn">
            <div className="pp-warn-label">◎ Poll closed</div>
            This poll is not accepting responses. Results will appear here after the creator publishes them.
          </div>
        ) : poll.blockedByAuth ? (
          <div style={{ animation: "pp-fadeUp .5s ease both .1s" }}>
            <AuthRequiredPanel />
          </div>
        ) : (
          <div className="pp-grid">
            <ResponseForm
              answers={poll.answers}
              error={poll.error}
              message={poll.message}
              poll={poll.publicPoll}
              respondentEmail={poll.respondentEmail}
              respondentName={poll.respondentName}
              setAnswers={poll.setAnswers}
              setRespondentEmail={poll.setRespondentEmail}
              setRespondentName={poll.setRespondentName}
              state={poll.publicState}
              submitting={poll.submitting}
              submit={poll.submit}
            />
            <PollStatusPanel analytics={poll.analytics} poll={poll.publicPoll} />
          </div>
        )}

        {/* ── Live results ── */}
        {poll.showResults && poll.publicPoll.status !== "published" ? (
          <div className="pp-live-results">
            <ResultsPanel analytics={poll.analytics} title="Live results" />
          </div>
        ) : null}

        {/* ── Footer bar ── */}
        <div className="pp-footer">
          <span className="pp-footer-label">Public response view</span>
          <button className="pp-footer-btn" onClick={() => navigate("/")} type="button">
            Powered by LLOP
          </button>
        </div>

      </div>
    </main>
  );
}
