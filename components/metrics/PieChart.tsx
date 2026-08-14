import type { PieSlice } from "@/lib/queries/metrics";

export function PieChart({ slices, emptyLabel }: { slices: PieSlice[]; emptyLabel: string }) {
  if (slices.length === 0) {
    return (
      <p style={{ fontSize: 13.5, color: "var(--text-muted)", padding: "20px 0" }}>{emptyLabel}</p>
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
          <div key={s.label} className="pl-item">
            <span className="sw" style={{ background: s.color }} />
            <span>{s.label}</span>
            <b>{s.pct}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}
