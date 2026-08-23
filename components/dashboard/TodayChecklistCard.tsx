"use client";

import { ChecklistItemRow } from "./ChecklistItemRow";
import type { DayChecklist, ChecklistItem } from "@/lib/queries/home";

export function TodayChecklistCard({ checklist, onEdit }: { checklist: DayChecklist; onEdit: (item: ChecklistItem) => void }) {
  const pct = checklist.totalCount > 0 ? Math.round((checklist.completedCount / checklist.totalCount) * 100) : 0;
  const allDone = checklist.totalCount > 0 && checklist.completedCount === checklist.totalCount;

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

      {checklist.items.length === 0 && <p className="muted-note">Nenhuma atividade programada para hoje.</p>}
      {allDone && <p className="muted-note" style={{ marginBottom: 12 }}>Tudo concluído por hoje! 🎉</p>}
      {checklist.items.length > 0 && (
        <div className="checklist-list">
          {checklist.items.map((item) => (
            <ChecklistItemRow key={item.id} item={item} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
