"use client";

import { useState } from "react";
import { EvolutionChart } from "@/components/metrics/EvolutionChart";
import { StageDistributionList } from "@/components/metrics/StageDistributionList";
import type { FlashcardHubEvolution } from "@/lib/queries/review";
import type { StageDistribution } from "@/lib/queries/metrics";
import type { DayBar } from "@/lib/metrics/calc";

const PERIODS: { value: keyof FlashcardHubEvolution; label: string }[] = [
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensal" },
  { value: "year", label: "Anual" },
];

// "Gráficos" do hub de Flashcards (documento de requisitos) — reaproveita
// EvolutionChart (evolução e carga futura têm o mesmo formato DayBar) e
// StageDistributionList sem criar nenhum componente de gráfico novo.
export function FlashcardsHubCharts({
  evolution,
  upcomingLoad,
  stageDistribution,
}: {
  evolution: FlashcardHubEvolution;
  upcomingLoad: DayBar[];
  stageDistribution: StageDistribution;
}) {
  const [period, setPeriod] = useState<keyof FlashcardHubEvolution>("week");

  return (
    <>
      <h2 className="section-title">Gráficos</h2>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 className="card-subtitle" style={{ marginBottom: 0 }}>
            Flashcards revisados ao longo do tempo
          </h3>
          <div className="metric-tabs" style={{ marginBottom: 0 }}>
            {PERIODS.map((p) => (
              <button key={p.value} type="button" className={period === p.value ? "active" : ""} onClick={() => setPeriod(p.value)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <EvolutionChart data={evolution[period]} emptyLabel="Nenhum flashcard revisado neste período." />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 className="card-subtitle">Revisões previstas para os próximos dias</h3>
          <EvolutionChart data={upcomingLoad} emptyLabel="Nenhuma revisão prevista para os próximos dias." />
        </div>
        <div className="card">
          <h3 className="card-subtitle">Estágio dos cartões</h3>
          <StageDistributionList distribution={stageDistribution} />
        </div>
      </div>
    </>
  );
}
