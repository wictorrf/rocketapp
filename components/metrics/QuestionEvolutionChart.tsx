import type { QuestionEvolutionPoint } from "@/lib/queries/metrics";

// Gráfico combinado (documento de requisitos de Métricas): barras para a
// quantidade de questões respondidas e uma linha sobreposta para o
// aproveitamento (%) — duas escalas diferentes no mesmo SVG, cada uma com o
// seu próprio eixo implícito. Pontos sem aproveitamento (balde sem nenhuma
// questão) quebram a linha em vez de interpolar.
export function QuestionEvolutionChart({ data, emptyLabel }: { data: QuestionEvolutionPoint[]; emptyLabel: string }) {
  if (data.length === 0) {
    return <p className="chart-empty">{emptyLabel}</p>;
  }

  const HEIGHT = 220;
  const TOP = 24;
  const BASELINE = 212;
  const BAR_MAX_HEIGHT = BASELINE - TOP - 8;
  const slotWidth = 40;
  const width = Math.max(320, data.length * slotWidth);
  const maxDone = Math.max(1, ...data.map((d) => d.done));

  const points = data.map((d, i) => {
    const cx = i * slotWidth + slotWidth / 2;
    const barHeight = Math.max(d.done > 0 ? 2 : 0, (d.done / maxDone) * BAR_MAX_HEIGHT);
    const cy = d.accuracyPct === null ? null : TOP + (1 - d.accuracyPct / 100) * (BASELINE - TOP);
    return { ...d, cx, barHeight, cy };
  });

  // Quebra a linha em segmentos contínuos onde há aproveitamento calculado.
  const segments: { cx: number; cy: number }[][] = [];
  let current: { cx: number; cy: number }[] = [];
  for (const p of points) {
    if (p.cy === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push({ cx: p.cx, cy: p.cy });
    }
  }
  if (current.length) segments.push(current);

  return (
    <div>
      <div className="combo-legend">
        <span className="combo-legend-item">
          <span className="combo-legend-dot" style={{ background: "var(--wine)" }} />
          Quantidade de questões
        </span>
        <span className="combo-legend-item">
          <span className="combo-legend-dot line" style={{ background: "var(--blue-academic)" }} />
          Aproveitamento (%)
        </span>
      </div>
      <div className="chart-scroll">
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} width={width} height={HEIGHT} role="img" aria-label="Evolução das questões: quantidade e aproveitamento">
          {points.map((p) => (
            <rect
              key={`bar-${p.key}`}
              x={p.cx - slotWidth * 0.28}
              y={BASELINE - p.barHeight}
              width={slotWidth * 0.56}
              height={p.barHeight}
              rx={4}
              fill="var(--wine)"
            >
              <title>{`${p.label}: ${p.done} ${p.done === 1 ? "questão" : "questões"}`}</title>
            </rect>
          ))}
          {segments.map((seg, i) => (
            <polyline key={`line-${i}`} points={seg.map((p) => `${p.cx},${p.cy}`).join(" ")} fill="none" stroke="var(--blue-academic)" strokeWidth={2} />
          ))}
          {points
            .filter((p) => p.cy !== null)
            .map((p) => (
              <circle key={`pt-${p.key}`} cx={p.cx} cy={p.cy!} r={3.5} fill="var(--blue-academic)">
                <title>{`${p.label}: ${p.accuracyPct}% de aproveitamento`}</title>
              </circle>
            ))}
        </svg>
        <div className="chart-x" style={{ minWidth: width }}>
          {data.map((d) => (
            <span key={d.key}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
