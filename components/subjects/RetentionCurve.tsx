import { retentionPctAt, type StageLabel } from "@/lib/srs/fsrs";
import { htmlToPlainText } from "@/lib/utils/sanitize-html";
import type { FlashcardWithState } from "@/lib/queries/topics";

const WIDTH = 640;
const HEIGHT = 200;
const PAD_X = 24;
const PAD_TOP = 16;
const PAD_BOTTOM = 34;
const PLOT_W = WIDTH - PAD_X * 2;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const RETENTION_TARGET = 90;
const MIN_MAX_DAYS = 14;

const STAGE_COLOR: Record<StageLabel, string> = {
  novo: "var(--wine)",
  aprendendo: "var(--amber)",
  revisao: "var(--green)",
  reaprendizagem: "var(--lavender)",
  suspenso: "var(--text-muted)",
};
const REINFORCE_COLOR = "var(--red-soft)";

function toX(days: number, maxDays: number): number {
  const clamped = Math.max(0, Math.min(days, maxDays));
  return PAD_X + (Math.sqrt(clamped) / Math.sqrt(maxDays)) * PLOT_W;
}

function toY(retentionPct: number): number {
  return PAD_TOP + (1 - Math.max(0, Math.min(100, retentionPct)) / 100) * PLOT_H;
}

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 86_400_000);
}

// Curva de retenção deste assunto — cada ponto é um flashcard real,
// posicionado onde ele está agora na própria curva de esquecimento (dias
// desde a última revisão × recuperabilidade estimada pelo FSRS). A linha de
// fundo é uma referência (estabilidade média dos cartões ativos), não uma
// medição exata por cartão. Sem dias fixos (1/3/7/15/30/60) — a escala do
// eixo horizontal se adapta à estabilidade real dos cartões do assunto.
export function RetentionCurve({ cards }: { cards: FlashcardWithState[] }) {
  const active = cards.filter((c) => !c.suspended);

  if (active.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
        Crie seu primeiro flashcard para começar a construir sua curva de retenção.
      </p>
    );
  }

  const avgStability = active.reduce((sum, c) => sum + Math.max(c.stability, 0.5), 0) / active.length;
  const maxDays = Math.max(MIN_MAX_DAYS, avgStability * 2, ...active.map((c) => daysSince(c.lastReviewAt)));

  const steps = 60;
  let curvePath = "";
  for (let i = 0; i <= steps; i++) {
    const days = (i / steps) * maxDays;
    const x = toX(days, maxDays);
    const y = toY(retentionPctAt(days, avgStability));
    curvePath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }

  const targetY = toY(RETENTION_TARGET);
  const milestoneX = toX(avgStability, maxDays);

  return (
    <div>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
        A curva se adapta ao seu desempenho. Cada ponto representa um flashcard, mostrando a
        recuperabilidade estimada pelo FSRS — diferente da retenção observada (baseada no seu
        histórico real de acertos) — e o Rocket usa essa estimativa pra calcular quando ele precisa
        aparecer novamente.
      </p>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Curva de retenção do assunto">
        <line
          x1={PAD_X}
          y1={targetY}
          x2={WIDTH - PAD_X}
          y2={targetY}
          stroke="var(--blue-academic)"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
        <text x={WIDTH - PAD_X} y={targetY - 6} fontSize={10} fontFamily="var(--font-mono)" fill="var(--blue-academic)" textAnchor="end">
          retenção desejada 90%
        </text>

        <path d={curvePath} fill="none" stroke="var(--line)" strokeWidth={2} />

        <line x1={milestoneX} y1={PAD_TOP} x2={milestoneX} y2={HEIGHT - PAD_BOTTOM} stroke="var(--amber)" strokeWidth={1} strokeDasharray="2 3" />
        <text x={milestoneX} y={HEIGHT - PAD_BOTTOM + 18} fontSize={10} fontFamily="var(--font-mono)" fill="var(--amber)" textAnchor="middle">
          momento estimado
        </text>

        {[0, 50, 100].map((pct) => (
          <text key={pct} x={PAD_X - 6} y={toY(pct) + 3} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--text-muted)" textAnchor="end">
            {pct}%
          </text>
        ))}

        {active.map((card) => {
          const elapsed = daysSince(card.lastReviewAt);
          const x = toX(elapsed, maxDays);
          const y = toY(card.retrievability * 100);
          const color = card.needsReinforcement ? REINFORCE_COLOR : STAGE_COLOR[card.stage];
          return (
            <circle key={card.id} cx={x} cy={y} r={5} fill={color} stroke="var(--white)" strokeWidth={1.5}>
              <title>
                {`${htmlToPlainText(card.front).slice(0, 60)} · ${card.stage} · recuperabilidade ${Math.round(card.retrievability * 100)}% · dificuldade ${card.difficulty.toFixed(1)} · estabilidade ${card.stability.toFixed(1)}d · ${card.reps} revisões · ${card.lapses} esquecimentos`}
              </title>
            </circle>
          );
        })}
      </svg>

      <div className="ebbinghaus-legend">
        <div className="li">
          <span className="dot" style={{ background: STAGE_COLOR.novo }} /> Novo
        </div>
        <div className="li">
          <span className="dot" style={{ background: STAGE_COLOR.aprendendo }} /> Em aprendizagem
        </div>
        <div className="li">
          <span className="dot" style={{ background: STAGE_COLOR.revisao }} /> Em revisão
        </div>
        <div className="li">
          <span className="dot" style={{ background: STAGE_COLOR.reaprendizagem }} /> Em reaprendizagem
        </div>
        <div className="li">
          <span className="dot" style={{ background: REINFORCE_COLOR }} /> Precisa de reforço
        </div>
      </div>
    </div>
  );
}
