import Link from "next/link";
import type { FlashcardMetrics } from "@/lib/queries/metrics";
import { ComparisonBadge } from "./ComparisonBadge";
import { EvolutionChart } from "./EvolutionChart";
import { StageDistributionList } from "./StageDistributionList";

export function FlashcardsSection({ metrics }: { metrics: FlashcardMetrics }) {
  return (
    <>
      <h2 className="section-title">Flashcards</h2>
      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="eyebrow">Revisados no período</div>
          <div className="stat-num">{metrics.reviewedCount}</div>
          <div className="stat-label">
            <ComparisonBadge comparison={metrics.reviewedComparison} />
          </div>
        </div>
        <div className="card">
          <div className="eyebrow">Retenção observada</div>
          {metrics.retentionPct === null ? (
            <>
              <div className="stat-num" style={{ fontSize: 20 }}>
                Ainda sem dados suficientes
              </div>
            </>
          ) : (
            <>
              <div className="stat-num">{metrics.retentionPct}%</div>
              <div className="stat-label">
                <ComparisonBadge comparison={metrics.retentionComparison} />
              </div>
            </>
          )}
        </div>
        <div className="card">
          <div className="eyebrow">Revisões previstas para hoje</div>
          <div className="stat-num">{metrics.dueTodayCount}</div>
          <div className="stat-label">
            {metrics.overdueCount > 0 ? `${metrics.overdueCount} atrasados, o resto previsto pra hoje` : "nenhum atraso"}
          </div>
          <Link href="/flashcards" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
            Começar revisão
          </Link>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-subtitle">Flashcards revisados por dia</h3>
          <EvolutionChart data={metrics.reviewsByDay} emptyLabel="Nenhum flashcard revisado neste período." />
        </div>
        <div className="card">
          <h3 className="card-subtitle">Estágio dos seus cartões</h3>
          <StageDistributionList distribution={metrics.stageDistribution} linkTo="/flashcards" />
        </div>
      </div>
    </>
  );
}
