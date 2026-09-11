import Link from "next/link";
import type { TimeSlice } from "@/lib/queries/metrics";
import { formatStudyDuration } from "@/lib/metrics/calc";

// Barras horizontais de distribuição de tempo (documento de requisitos de
// Métricas — "Tempo por tipo de atividade"). Largura proporcional ao maior
// valor do conjunto, já ordenado do maior pro menor pela própria query.
export function HorizontalBarChart({
  slices,
  emptyLabel,
  emptyHref,
  emptyActionLabel,
}: {
  slices: TimeSlice[];
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

  const maxMinutes = Math.max(1, ...slices.map((s) => s.minutes));

  return (
    <div className="hbar-list">
      {slices.map((s) => (
        <div key={s.key} className="hbar-row" title={`${s.label}, ${formatStudyDuration(s.minutes)}, ${s.pct}% do período`}>
          <span className="hbar-label">{s.label}</span>
          <span className="hbar-track">
            <span className="hbar-fill" style={{ width: `${Math.max(3, (s.minutes / maxMinutes) * 100)}%`, background: s.color }} />
          </span>
          <span className="hbar-value">{formatStudyDuration(s.minutes)}</span>
        </div>
      ))}
    </div>
  );
}
