"use client";

import { useState } from "react";
import Link from "next/link";
import type { TimeSlice } from "@/lib/queries/metrics";
import { formatStudyDuration } from "@/lib/metrics/calc";

// Donut de distribuição de tempo (documento de requisitos de Métricas —
// "Tempo de estudo por disciplina"). Passar o mouse numa fatia da legenda
// mostra o tooltip nativo; clicar fixa o detalhe abaixo do gráfico (nome,
// horas estudadas, % do período) — cobre tanto hover quanto toque.
export function DonutChart({
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
  const [selectedKey, setSelectedKey] = useState<string | null>(slices[0]?.key ?? null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

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

  const activeKey = hoveredKey ?? selectedKey;
  const active = slices.find((s) => s.key === activeKey) ?? slices[0];

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
    <div>
      <div className="pie-chart-row">
        <div className="pie-chart donut" style={{ background: `conic-gradient(${stops})` }} />
        <div className="pie-legend">
          {slices.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`pl-item${s.key === activeKey ? " active" : ""}`}
              title={`${s.label}, ${formatStudyDuration(s.minutes)}, ${s.pct}%, ${s.sessionsCount} ${s.sessionsCount === 1 ? "sessão" : "sessões"}`}
              onMouseEnter={() => setHoveredKey(s.key)}
              onMouseLeave={() => setHoveredKey(null)}
              onClick={() => setSelectedKey(s.key)}
            >
              <span className="sw" style={{ background: s.color }} />
              <span>
                {s.label}
                <em>
                  {formatStudyDuration(s.minutes)} · {s.sessionsCount} {s.sessionsCount === 1 ? "sessão" : "sessões"}
                </em>
              </span>
              <b>{s.pct}%</b>
            </button>
          ))}
        </div>
      </div>
      {active && (
        <div className="donut-detail">
          <span className="sw" style={{ background: active.color }} />
          <div>
            <strong>{active.label}</strong>
            <span>
              {formatStudyDuration(active.minutes)} estudadas · {active.pct}% do período
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
