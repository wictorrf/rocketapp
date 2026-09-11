import type { StudyTimeMetrics } from "@/lib/queries/metrics";
import { DonutChart } from "./DonutChart";
import { HorizontalBarChart } from "./HorizontalBarChart";

export function StudyDistributionSection({ metrics }: { metrics: StudyTimeMetrics }) {
  return (
    <>
      <h2 className="section-title">Distribuição do estudo</h2>
      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-subtitle">Tempo de estudo por disciplina</h3>
          <DonutChart slices={metrics.bySubject} emptyLabel="Nenhum tempo de estudo registrado ainda." emptyHref="/focus" emptyActionLabel="Abrir Study Time" />
        </div>
        <div className="card">
          <h3 className="card-subtitle">Tempo por tipo de atividade</h3>
          <HorizontalBarChart slices={metrics.byActivity} emptyLabel="Nenhum tempo de estudo registrado ainda." emptyHref="/focus" emptyActionLabel="Abrir Study Time" />
        </div>
      </div>
    </>
  );
}
