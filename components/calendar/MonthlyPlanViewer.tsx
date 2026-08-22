"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PILLAR_LABEL, PILLAR_EMOJI } from "@/lib/constants/pillars";
import { deleteMonthlyPlanAction } from "@/lib/actions/calendar";
import type { MonthlyPlan, MonthlyPlanAction } from "@/lib/queries/calendar";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";
import { MonthlyReviewForm } from "./MonthlyReviewForm";
import { MonthlyPlanForm } from "./MonthlyPlanForm";
import { MonthlyPlanActionsList } from "./MonthlyPlanActionsList";

export function MonthlyPlanViewer({
  plan,
  month,
  monthLabel,
  planActions,
  subjects,
}: {
  plan: MonthlyPlan;
  month: string;
  monthLabel: string;
  planActions: MonthlyPlanAction[];
  subjects: SubjectWithTopicsOption[];
}) {
  const router = useRouter();
  const { goals } = plan;
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteLinkedEvents, setDeleteLinkedEvents] = useState(false);
  const [pending, setPending] = useState(false);

  const linkedCount = planActions.filter((a) => a.calendarTaskId).length;

  async function handleDelete() {
    setPending(true);
    await deleteMonthlyPlanAction(plan.id, deleteLinkedEvents);
    setPending(false);
    setConfirmingDelete(false);
    router.refresh();
  }

  if (editing) {
    return <MonthlyPlanForm month={month} monthLabel={monthLabel} existingGoals={goals} onSaved={() => setEditing(false)} />;
  }

  return (
    <div className="plan-viewer">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div className="plan-mission">“{goals.mission}”</div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            Editar planejamento
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingDelete(true)}>
            Excluir
          </button>
        </div>
      </div>

      {goals.pillars.map((pillar) => (
        <div key={pillar.key} className="plan-pillar">
          <b className="plan-pillar-title">
            {PILLAR_EMOJI[pillar.key] ?? "🎯"} {pillar.key === "outro" ? pillar.customLabel || "Outro" : (PILLAR_LABEL[pillar.key] ?? pillar.key)}
          </b>
          {pillar.purpose && <div className="plan-purpose">Propósito: {pillar.purpose}</div>}
          {pillar.metas.length > 0 && (
            <ul>
              {pillar.metas.map((meta, i) => (
                <li key={i}>{meta}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <MonthlyPlanActionsList planId={plan.id} actions={planActions} subjects={subjects} />

      {goals.review ? (
        <div className="plan-review-box">
          <b>Revisão do mês</b>
          {goals.review}
        </div>
      ) : (
        <MonthlyReviewForm month={month} monthLabel={monthLabel} />
      )}

      {confirmingDelete && (
        <div className="modal-overlay" onClick={() => setConfirmingDelete(false)}>
          <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Excluir planejamento de {monthLabel}</h2>
            <p className="confirm-dialog-body">
              Isso removerá a missão, {goals.pillars.length} pilar{goals.pillars.length === 1 ? "" : "es"} e{" "}
              {planActions.length} ação{planActions.length === 1 ? "" : "ões"} desse mês.
              {linkedCount > 0 &&
                ` ${linkedCount} ${linkedCount === 1 ? "delas está vinculada" : "delas estão vinculadas"} a eventos do Calendário.`}
            </p>
            {linkedCount > 0 && (
              <label className="cal-filter-check" style={{ marginBottom: 14 }}>
                <input type="checkbox" checked={deleteLinkedEvents} onChange={(e) => setDeleteLinkedEvents(e.target.checked)} />
                Excluir também os eventos vinculados no Calendário
              </label>
            )}
            <div className="confirm-dialog-actions">
              <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" disabled={pending} onClick={handleDelete}>
                Excluir planejamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
