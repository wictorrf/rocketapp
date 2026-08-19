import type { StageLabel } from "@/lib/srs/sm2";

const MAX_DAYS = 60;
const MILESTONES = [0, 1, 3, 7, 15, 30, 60];
const WIDTH = 640;
const HEIGHT = 200;
const PAD_X = 24;
const PAD_TOP = 16;
const PAD_BOTTOM = 34;
const PLOT_W = WIDTH - PAD_X * 2;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

const STAGE_COLOR: Record<StageLabel, string> = {
  novo: "#6E1E33",
  aprendendo: "#C98A2C",
  consolidado: "#4C8B6E",
};

function toX(days: number): number {
  const clamped = Math.max(0, Math.min(days, MAX_DAYS));
  return PAD_X + (Math.sqrt(clamped) / Math.sqrt(MAX_DAYS)) * PLOT_W;
}

// Curva de decaimento clássica de Ebbinghaus — retenção estimada em função
// dos dias desde a última revisão. É uma curva de referência (formato
// exponencial), não uma medição exata por cartão: o que importa aqui é
// mostrar onde cada cartão está nessa trajetória.
function retentionAt(days: number): number {
  return 100 * Math.exp(-days / 9);
}

function toY(retentionPct: number): number {
  return PAD_TOP + (1 - retentionPct / 100) * PLOT_H;
}

function buildCurvePath(): string {
  const steps = 60;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const days = (i / steps) * MAX_DAYS;
    const x = toX(days);
    const y = toY(retentionAt(days));
    d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }
  return d;
}

export function EbbinghausCurve({
  cards,
}: {
  cards: { id: string; stage: StageLabel; intervalDays: number }[];
}) {
  const curvePath = buildCurvePath();

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Curva do esquecimento">
        <path d={curvePath} fill="none" stroke="var(--line)" strokeWidth={2} />

        {MILESTONES.map((d) => (
          <g key={d}>
            <line
              x1={toX(d)}
              y1={PAD_TOP}
              x2={toX(d)}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--line)"
              strokeWidth={1}
              strokeDasharray="2 4"
              opacity={0.5}
            />
            <text
              x={toX(d)}
              y={HEIGHT - PAD_BOTTOM + 18}
              fontSize={10.5}
              fontFamily="var(--font-mono)"
              fill="var(--text-muted)"
              textAnchor="middle"
            >
              {d === 0 ? "hoje" : `${d}d`}
            </text>
          </g>
        ))}

        {cards.map((card) => {
          const x = toX(card.intervalDays);
          const y = toY(retentionAt(card.intervalDays));
          return (
            <circle
              key={card.id}
              cx={x}
              cy={y}
              r={5}
              fill={STAGE_COLOR[card.stage]}
              stroke="var(--white)"
              strokeWidth={1.5}
            >
              <title>{`${card.stage} · ${card.intervalDays}d`}</title>
            </circle>
          );
        })}
      </svg>

      <div className="ebbinghaus-legend">
        <div className="li">
          <span className="dot" style={{ background: STAGE_COLOR.novo }} /> Novo
        </div>
        <div className="li">
          <span className="dot" style={{ background: STAGE_COLOR.aprendendo }} /> Aprendendo
        </div>
        <div className="li">
          <span className="dot" style={{ background: STAGE_COLOR.consolidado }} /> Consolidado
        </div>
      </div>
    </div>
  );
}
