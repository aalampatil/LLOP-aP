import type { ReactNode } from "react";

export function DashboardMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="db-metric">
      <div className="db-metric-label">
        {icon}
        {label}
      </div>
      <div className="db-metric-value">{value}</div>
    </div>
  );
}

export function DashboardPreviewRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="db-preview-row">
      <span className="db-preview-label">
        {icon}
        {label}
      </span>
      <span className="db-preview-value">{value}</span>
    </div>
  );
}
