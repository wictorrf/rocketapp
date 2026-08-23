import Link from "next/link";
import type { QuestionMetrics } from "@/lib/queries/metrics";
import { ComparisonBadge } from "./ComparisonBadge";
import { EvolutionChart } from "./EvolutionChart";

export function QuestionsSection({ metrics }: { metrics: QuestionMetrics }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 className="section-title">Questões registradas</h2>
        <Link href="/subjects" className="btn btn-ghost btn-sm">
          Ver registros
        </Link>
      </div>
      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="eyebrow">Questões respondidas</div>
          <div className="stat-num">{metrics.respondedCount}</div>
          <div className="stat-label">
            <ComparisonBadge comparison={metrics.respondedComparison} />
          </div>
        </div>
        <div className="card">
          <div className="eyebrow">Acertos</div>
          <div className="stat-num">{metrics.correctCount}</div>
        </div>
        <div className="card">
          <div className="eyebrow">Porcentagem de acertos</div>
          {metrics.accuracyPct === null ? (
            <div className="stat-num" style={{ fontSize: 20 }}>
              Ainda sem dados suficientes
            </div>
          ) : (
            <>
              <div className="stat-num">{metrics.accuracyPct}%</div>
              <div className="stat-label">
                <ComparisonBadge comparison={metrics.accuracyComparison} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-subtitle">Evolução das questões</h3>
        <EvolutionChart data={metrics.evolution} emptyLabel="Nenhuma questão registrada neste período." />
      </div>
    </>
  );
}
