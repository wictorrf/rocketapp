import Link from "next/link";
import type { PieSlice } from "@/lib/queries/metrics";
import { formatStudyDuration } from "@/lib/metrics/calc";

export function PieChart({
  slices,
  emptyLabel,
  emptyHref,
  emptyActionLabel,
}: {
  slices: PieSlice[];
  emptyLabel: string;
  emptyHref?: string;
  emptyActionLabel?: string;
}) {
  if (slices.length === 0) {
    return (
      <div style={{ padding: "20px 0" }}>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: emptyHref ? 12 : 0 }}>{emptyLabel}</p>
        {emptyHref && emptyActionLabel && (
          <Link href={emptyHref} className="btn btn-ghost btn-sm">
            {emptyActionLabel}
          </Link>
        )}
      </div>
    );
  }

  const { items } = slices.reduce<{ cumulative: number; items: string[] }>(
    (acc, s, i) => {
      const start = acc.cumulative;
      const end = i === slices.length - 1 ? 100 : acc.cumulative + s.pct;
      return { cumulative: end, items: [...acc.items, `${s.color} ${start}% ${end}%`] };
    },
    { cumulative: 0, items: [] },
  );
  const stops = items.join(", ");

  return (
    <div className="pie-chart-row">
      <div className="pie-chart" style={{ background: `conic-gradient(${stops})` }} />
      <div className="pie-legend">
        {slices.map((s) => (
          <div
            key={s.key}
            className="pl-item"
            title={`${s.label}, ${formatStudyDuration(s.minutes)}, ${s.pct}%, ${s.sessionsCount} ${s.sessionsCount === 1 ? "sessão" : "sessões"}`}
          >
            <span className="sw" style={{ background: s.color }} />
            <span>
              {s.label}
              <em>
                {formatStudyDuration(s.minutes)} · {s.sessionsCount} {s.sessionsCount === 1 ? "sessão" : "sessões"}
              </em>
            </span>
            <b>{s.pct}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}
