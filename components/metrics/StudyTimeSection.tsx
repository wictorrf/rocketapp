import type { StudyTimeMetrics } from "@/lib/queries/metrics";
import { formatStudyDuration } from "@/lib/metrics/calc";
import { ComparisonBadge } from "./ComparisonBadge";
import { EvolutionChart } from "./EvolutionChart";
import { PieChart } from "./PieChart";

export function StudyTimeSection({ metrics }: { metrics: StudyTimeMetrics }) {
  return (
    <>
      <h2 className="section-title">Tempo de estudo</h2>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="eyebrow">Horas líquidas de estudo</div>
        <div className="stat-num">{formatStudyDuration(metrics.netMinutes)}</div>
        <div className="stat-label">
          {metrics.sessionsCount} {metrics.sessionsCount === 1 ? "sessão" : "sessões"} ·{" "}
          <ComparisonBadge comparison={metrics.netMinutesComparison} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-subtitle">Evolução do tempo de estudo</h3>
        <EvolutionChart data={metrics.evolution} emptyLabel="Nenhuma sessão de Study Time registrada neste período." formatValue={(v) => formatStudyDuration(v)} />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-subtitle">Tempo de estudo por matéria</h3>
          <PieChart slices={metrics.bySubject} emptyLabel="Nenhum tempo de estudo registrado ainda." emptyHref="/focus" emptyActionLabel="Abrir Study Time" />
        </div>
        <div className="card">
          <h3 className="card-subtitle">Tempo por tipo de atividade</h3>
          <PieChart slices={metrics.byActivity} emptyLabel="Nenhum tempo de estudo registrado ainda." emptyHref="/focus" emptyActionLabel="Abrir Study Time" />
        </div>
      </div>
    </>
  );
}
