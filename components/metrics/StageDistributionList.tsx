import Link from "next/link";
import { STAGE_BREAKDOWN_LABEL_PT, type StageBreakdownLabel } from "@/lib/srs/fsrs";
import type { StageDistribution } from "@/lib/queries/metrics";

const ORDER: StageBreakdownLabel[] = ["novo", "aprendendo", "revisao", "reaprendizagem", "consolidado"];
const DOT_CLASS: Record<StageBreakdownLabel, string> = {
  novo: "fc-stage novo",
  aprendendo: "fc-stage aprendendo",
  revisao: "fc-stage revisao",
  reaprendizagem: "fc-stage reaprendizagem",
  consolidado: "fc-stage consolidado",
};

// `linkTo` é opcional: em Métricas cada linha leva de volta pro hub de
// Flashcards; dentro do próprio hub (Fase Flashcards) um link pra "/flashcards"
// não faz sentido, então as linhas ficam estáticas.
export function StageDistributionList({ distribution, linkTo }: { distribution: StageDistribution; linkTo?: string }) {
  const total = ORDER.reduce((sum, k) => sum + distribution[k], 0);

  if (total === 0) {
    return <p className="chart-empty">Você ainda não criou nenhum flashcard.</p>;
  }

  return (
    <div>
      {ORDER.map((key) => {
        const content = (
          <>
            <span className={DOT_CLASS[key]} style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%" }} />
            <span className="wp-name">{STAGE_BREAKDOWN_LABEL_PT[key]}</span>
            <span className="wp-pct">{distribution[key]}</span>
          </>
        );
        return linkTo ? (
          <Link href={linkTo} key={key} className="weak-point">
            {content}
          </Link>
        ) : (
          <div key={key} className="weak-point">
            {content}
          </div>
        );
      })}
    </div>
  );
}
