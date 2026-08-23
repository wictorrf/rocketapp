"use client";

import { useState } from "react";
import { ChecklistItemRow } from "./ChecklistItemRow";
import type { WeekChecklist, ChecklistItem } from "@/lib/queries/home";

const STATUS_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "done", label: "Concluídas" },
  { value: "cancelled", label: "Canceladas" },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

function normalize(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function WeekChecklistCard({
  checklist,
  onEdit,
  onCreate,
}: {
  checklist: WeekChecklist;
  onEdit: (item: ChecklistItem) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  function toggleDay(dateKey: string) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  const needle = normalize(search.trim());
  function matches(item: ChecklistItem) {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (!needle) return true;
    return [item.title, item.subjectName, item.topicName]
      .filter((v): v is string => Boolean(v))
      .some((v) => normalize(v).includes(needle));
  }

  const pct = checklist.totalCount > 0 ? Math.round((checklist.completedCount / checklist.totalCount) * 100) : 0;

  return (
    <div className="card">
      <div className="checklist-card-head">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Checklist da semana
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

      <div className="checklist-toolbar">
        <input
          type="search"
          placeholder="Buscar por título, disciplina ou assunto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary btn-sm" onClick={onCreate}>
          + Adicionar atividade
        </button>
      </div>

      <div className="week-checklist-days">
        {checklist.days.map((day) => {
          const items = day.items.filter(matches);
          const isCollapsed = collapsedDays.has(day.dateKey);
          const countable = day.items.filter((i) => i.kind !== "fsrs" && i.status !== "cancelled");
          const countableDone = countable.filter((i) => i.status === "done").length;

          return (
            <div key={day.dateKey} className={`week-checklist-day${day.isToday ? " today" : ""}`}>
              <button type="button" className="week-checklist-day-head" onClick={() => toggleDay(day.dateKey)}>
                <span className="wcd-label">
                  {day.dayLabel} · {Number(day.dateKey.slice(-2))}
                </span>
                {countable.length > 0 && (
                  <span className="wcd-count">
                    {countableDone}/{countable.length}
                  </span>
                )}
                <span className="wcd-caret">{isCollapsed ? "▸" : "▾"}</span>
              </button>
              {!isCollapsed &&
                (items.length === 0 ? (
                  <p className="muted-note" style={{ padding: "4px 0 10px" }}>
                    {day.items.length === 0 ? "Nada programado." : "Nada encontrado com esse filtro."}
                  </p>
                ) : (
                  <div className="checklist-list">
                    {items.map((item) => (
                      <ChecklistItemRow key={item.id} item={item} onEdit={onEdit} />
                    ))}
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
