import { Users } from "lucide-react";
import { formatDate } from "../../lib/poll-utils";
import type { ResponseDetail } from "../../types/poll";

export function IndividualResponses({ responses }: { responses: ResponseDetail[] }) {
  return (
    <section className="neo-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-3xl font-black">Individual responses</h2>
        <span className="premium-badge">{responses.length} entries</span>
      </div>
      <div className="space-y-3">
        {responses.length === 0 ? (
          <p className="text-sm font-bold text-muted-foreground">No responses yet.</p>
        ) : (
          responses.map((response) => (
            <article className="border border-border bg-background p-4" key={response.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-muted-foreground">
                  <Users size={13} />
                  {response.respondentName ||
                    response.respondentEmail ||
                    (response.isAnonymous
                      ? "Anonymous respondent"
                      : "Signed-in respondent")}
                </div>
                <time className="text-xs text-muted-foreground">
                  {formatDate(response.submittedAt)}
                </time>
              </div>
              <div className="grid gap-2">
                {response.answers.map((answer) => (
                  <div
                    className="border-t border-border pt-2"
                    key={`${response.id}-${answer.questionId}`}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-muted-foreground">
                      {answer.question}
                    </p>
                    <p className="font-black">{answer.selectedOptionLabel}</p>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
