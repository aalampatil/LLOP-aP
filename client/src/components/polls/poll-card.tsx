import { BarChart3, Check, CopyPlus, Loader2, Radio, Send, Share2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiError, useApiClient } from "../../lib/api";
import { publicPollUrl } from "../../lib/poll-utils";
import type { Poll, PollSummary } from "../../types/poll";
import { Badge } from "../ui/badge";
import { CopyPublicLinkButton } from "../ui/copy-public-link-button";
import { Metric } from "../ui/metric";

export function PollCard({ poll }: { poll: PollSummary }) {
  const navigate = useNavigate();
  const api = useApiClient();
  const [duplicating, setDuplicating] = useState(false);
  const shareUrl = publicPollUrl(poll.slug);

  const duplicate = async () => {
    setDuplicating(true);
    try {
      const data = await api.post<{ poll: Poll }>(`/api/poll/${poll.id}/duplicate`);
      navigate(`/dashboard/${data.poll.id}`);
    } catch (error) {
      window.alert(getApiError(error, "Could not duplicate poll"));
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <article className="neo-panel group p-5 transition duration-200 hover:-translate-y-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge>{poll.status}</Badge>
            <Badge>{poll.isAnonymous ? "anonymous" : "authenticated"}</Badge>
            {poll.expired ? <Badge>expired</Badge> : null}
          </div>
          <h3 className="text-2xl font-black tracking-tight">{poll.title}</h3>
          <p className="mt-1 line-clamp-2 font-semibold leading-6 text-muted-foreground">
            {poll.description || "No description"}
          </p>
        </div>
        <CopyPublicLinkButton url={shareUrl} variant="compact" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<Send />}
          label="Responses"
          value={poll.analytics.totalResponses.toString()}
        />
        <Metric
          icon={<Check />}
          label="Complete"
          value={`${poll.analytics.completionRate}%`}
        />
        <Metric
          icon={<Radio />}
          label="Questions"
          value={poll.questions?.length?.toString() || "0"}
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="neo-button bg-black"
          onClick={() => navigate(`/dashboard/${poll.id}`)}
          type="button"
        >
          <BarChart3 className="size-4" /> Analytics
        </button>
        <button
          className="neo-button bg-white"
          onClick={() => window.open(shareUrl, "_blank")}
          type="button"
        >
          <Share2 className="size-4" /> Public link
        </button>
        <CopyPublicLinkButton url={shareUrl} />
        <button
          className="neo-button bg-main"
          disabled={duplicating}
          onClick={duplicate}
          type="button"
        >
          {duplicating ? <Loader2 className="size-4 animate-spin" /> : <CopyPlus className="size-4" />}
          Duplicate
        </button>
      </div>
    </article>
  );
}
