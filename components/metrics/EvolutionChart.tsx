import type { DayBar } from "@/lib/queries/metrics";

export function EvolutionChart({
  data,
  emptyLabel,
  formatValue,
}: {
  data: DayBar[];
  emptyLabel: string;
  formatValue?: (value: number) => string;
}) {
  if (data.length === 0) {
    return <p className="chart-empty">{emptyLabel}</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div className="chart-scroll">
      <div className="chart-placeholder" style={{ minWidth: Math.max(320, data.length * 30) }}>
        {data.map((d) => (
          <div
            key={d.key}
            className="bar"
            style={{ height: `${Math.max(2, Math.round((d.value / max) * 100))}%` }}
            tabIndex={0}
            aria-label={`${d.label}: ${fmt(d.value)}`}
          >
            {d.value > 0 && <span>{fmt(d.value)}</span>}
          </div>
        ))}
      </div>
      <div className="chart-x" style={{ minWidth: Math.max(320, data.length * 30) }}>
        {data.map((d) => (
          <span key={d.key}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
