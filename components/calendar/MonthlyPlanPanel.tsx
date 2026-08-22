"use client";

import { useState } from "react";
import { RocketIcon } from "@/components/ui/RocketIcon";
import { MonthlyPlanForm } from "./MonthlyPlanForm";
import { MonthlyPlanViewer } from "./MonthlyPlanViewer";
import type { MonthlyPlan, MonthlyPlanAction } from "@/lib/queries/calendar";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

export function MonthlyPlanPanel({
  month,
  monthLabel,
  plan,
  planActions,
  subjects,
  startExpanded,
}: {
  month: string;
  monthLabel: string;
  plan: MonthlyPlan | null;
  planActions: MonthlyPlanAction[];
  subjects: SubjectWithTopicsOption[];
  startExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(startExpanded);

  if (!expanded) {
    const activeCount = planActions.filter((a) => a.status !== "archived").length;
    const doneCount = planActions.filter((a) => a.status === "done").length;
    const pct = activeCount ? Math.round((doneCount / activeCount) * 100) : 0;

    return (
      <div className="ritual-banner">
        <div className="rb-left">
          <div className="rb-icon">
            <RocketIcon size={20} />
          </div>
          <div>
            <b>Ritual de planejamento mensal</b>
            <span>
              {plan ? plan.goals.mission : `Defina suas metas de ${monthLabel} e deixe a rotina organizada automaticamente`}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {plan && activeCount > 0 && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
              {doneCount}/{activeCount} ações · {pct}%
            </span>
          )}
          <button type="button" className="btn btn-pink btn-sm" onClick={() => setExpanded(true)}>
            {plan ? "Abrir planejamento" : "Começar planejamento"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => setExpanded(false)}>
        ‹ Recolher planejamento
      </button>
      {plan ? (
        <MonthlyPlanViewer plan={plan} month={month} monthLabel={monthLabel} planActions={planActions} subjects={subjects} />
      ) : (
        <MonthlyPlanForm month={month} monthLabel={monthLabel} onSaved={() => {}} />
      )}
    </div>
  );
}
