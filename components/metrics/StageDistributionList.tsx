import Link from "next/link";
import { STAGE_LABEL_PT, type StageLabel } from "@/lib/srs/fsrs";
import type { StageDistribution } from "@/lib/queries/metrics";

const ORDER: StageLabel[] = ["novo", "aprendendo", "revisao", "reaprendizagem", "suspenso"];
const DOT_CLASS: Record<StageLabel, string> = {
  novo: "fc-stage novo",
  aprendendo: "fc-stage aprendendo",
  revisao: "fc-stage revisao",
  reaprendizagem: "fc-stage reaprendizagem",
  suspenso: "fc-stage suspenso",
};

export function StageDistributionList({ distribution, consolidatedCount }: { distribution: StageDistribution; consolidatedCount: number }) {
  const total = ORDER.reduce((sum, k) => sum + distribution[k], 0);

  if (total === 0) {
    return <p className="chart-empty">Você ainda não criou nenhum flashcard.</p>;
  }

  return (
    <div>
      {ORDER.map((key) => (
        <Link href="/flashcards" key={key} className="weak-point">
          <span className={DOT_CLASS[key]} style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%" }} />
          <span className="wp-name">{STAGE_LABEL_PT[key]}</span>
          <span className="wp-pct">{distribution[key]}</span>
        </Link>
      ))}
      {consolidatedCount > 0 && (
        <p className="chart-x" style={{ marginTop: 10, textAlign: "left" }}>
          {consolidatedCount} {consolidatedCount === 1 ? "cartão consolidado" : "cartões consolidados"} (em revisão há 21+ dias de estabilidade)
        </p>
      )}
    </div>
  );
}
