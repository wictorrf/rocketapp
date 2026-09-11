import type { QuestionMetrics } from "@/lib/queries/metrics";
import { ComparisonBadge } from "./ComparisonBadge";
import { QuestionEvolutionChart } from "./QuestionEvolutionChart";

export function QuestionsSection({ metrics }: { metrics: QuestionMetrics }) {
  return (
    <>
      <h2 className="section-title">Questões registradas</h2>
      <div className="sd-summary" style={{ marginBottom: 20 }}>
        <div className="sd-sum-item">
          <span>Questões respondidas</span>
          <b>{metrics.respondedCount}</b>
          <ComparisonBadge comparison={metrics.respondedComparison} />
        </div>
        <div className="sd-sum-item">
          <span>Acertos</span>
          <b>{metrics.correctCount}</b>
        </div>
        <div className="sd-sum-item">
          <span>Aproveitamento</span>
          {metrics.accuracyPct === null ? (
            <b style={{ fontSize: 14 }}>Ainda sem dados suficientes</b>
          ) : (
            <>
              <b>{metrics.accuracyPct}%</b>
              <ComparisonBadge comparison={metrics.accuracyComparison} />
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-subtitle">Evolução das questões</h3>
        <QuestionEvolutionChart data={metrics.evolution} emptyLabel="Nenhuma questão registrada neste período." />
      </div>
    </>
  );
}
