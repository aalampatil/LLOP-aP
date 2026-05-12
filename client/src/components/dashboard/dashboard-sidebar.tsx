import { Clock, Download, Eye, Link2, Lock, QrCode, ShieldCheck } from "lucide-react";
import { formatDate } from "../../lib/poll-utils";
import type { Poll } from "../../types/poll";
import { CopyPublicLinkButton } from "../ui/copy-public-link-button";
import { DashboardPreviewRow } from "./dashboard-metric";

export function DashboardSidebar({
  poll,
  shareUrl,
  downloadQr,
}: {
  poll: Poll;
  shareUrl: string;
  downloadQr: () => void;
}) {
  return (
    <aside className="db-sidebar">
      <h2 className="db-sidebar-title">Share room</h2>
      <div className="db-url-box">{shareUrl}</div>
      <CopyPublicLinkButton
        url={shareUrl}
        className="db-btn db-btn-secondary"
        style={{ width: "100%", justifyContent: "center" }}
      />
      <div className="mt-4 rounded-md border border-border bg-white p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-black">
          <QrCode size={14} /> QR share
        </div>
        <img
          alt="Poll share QR code"
          className="mx-auto h-40 w-40"
          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`}
        />
        <button className="db-btn db-btn-secondary mt-3 w-full" onClick={downloadQr} type="button">
          <Download size={14} /> Download QR
        </button>
      </div>
      <hr className="db-divider" />
      <DashboardPreviewRow icon={<Clock size={12} />} label="Expires" value={formatDate(poll.expiresAt)} />
      <DashboardPreviewRow icon={<Lock size={12} />} label="Mode" value={poll.isAnonymous ? "Anonymous" : "Authenticated"} />
      <DashboardPreviewRow icon={<Eye size={12} />} label="Public results" value={poll.status === "published" ? "Published" : "Hidden"} />
      <DashboardPreviewRow icon={<Link2 size={12} />} label="Slug" value={poll.slug} />
      <DashboardPreviewRow icon={<ShieldCheck size={12} />} label="Status" value={poll.status} />
    </aside>
  );
}
