"use client";

import { useState } from "react";
import { ChecklistItemRow } from "./ChecklistItemRow";
import type { DayChecklist, ChecklistItem } from "@/lib/queries/home";

type StatusFilter = "pendentes" | "todas" | "concluidas";

const FILTER_LABEL: Record<StatusFilter, string> = {
  pendentes: "Pendentes",
  todas: "Todas",
  concluidas: "Concluídas",
};

function matchesFilter(item: ChecklistItem, filter: StatusFilter): boolean {
  if (filter === "todas") return true;
  if (filter === "concluidas") return item.status === "done";
  return item.status !== "done"; // pendentes: inclui canceladas e revisões FSRS pendentes
}

export function TodayChecklistCard({
  checklist,
  onEdit,
  onCreate,
}: {
  checklist: DayChecklist;
  onEdit: (item: ChecklistItem) => void;
  onCreate: () => void;
}) {
  const [filter, setFilter] = useState<StatusFilter>("pendentes");
  const pct = checklist.totalCount > 0 ? Math.round((checklist.completedCount / checklist.totalCount) * 100) : 0;
  const allDone = checklist.totalCount > 0 && checklist.completedCount === checklist.totalCount;
  const visibleItems = checklist.items.filter((item) => matchesFilter(item, filter));

  return (
    <div className="card">
      <div className="checklist-card-head">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Checklist de hoje
        </h2>
        {checklist.totalCount > 0 && (
          <span className="checklist-progress-label">
            {checklist.completedCount} de {checklist.totalCount} concluídas
          </span>
        )}
      </div>

      {checklist.totalCount > 0 && (
        <div className="checklist-progress-bar">
          <div style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="metric-tabs" style={{ marginBottom: 12 }}>
        {(Object.keys(FILTER_LABEL) as StatusFilter[]).map((key) => (
          <button key={key} type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>
            {FILTER_LABEL[key]}
          </button>
        ))}
      </div>

      {allDone && filter === "pendentes" && <p className="muted-note" style={{ marginBottom: 12 }}>Tudo concluído por hoje! 🎉</p>}
      {visibleItems.length === 0 ? (
        <p className="muted-note">
          {filter === "concluidas" ? "Nenhuma atividade concluída ainda hoje." : "Nenhuma atividade programada para hoje."}
        </p>
      ) : (
        <div className="checklist-list">
          {visibleItems.map((item) => (
            <ChecklistItemRow key={item.id} item={item} onEdit={onEdit} />
          ))}
        </div>
      )}

      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={onCreate}>
        + Adicionar atividade
      </button>
    </div>
  );
}
