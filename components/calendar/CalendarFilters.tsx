"use client";

import { useState } from "react";
import { TASK_TYPE_OPTIONS } from "@/lib/constants/calendar";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

export type CalendarFilterState = {
  types: string[];
  subjectId: string | null;
  status: "all" | "pending" | "done" | "cancelled";
};

export const EMPTY_CALENDAR_FILTERS: CalendarFilterState = { types: [], subjectId: null, status: "all" };

export function calendarFilterActive(f: CalendarFilterState): boolean {
  return f.types.length > 0 || Boolean(f.subjectId) || f.status !== "all";
}

export function CalendarFilters({
  value,
  onChange,
  subjects,
}: {
  value: CalendarFilterState;
  onChange: (next: CalendarFilterState) => void;
  subjects: SubjectWithTopicsOption[];
}) {
  const [open, setOpen] = useState(false);

  function toggleType(type: string) {
    const next = value.types.includes(type) ? value.types.filter((t) => t !== type) : [...value.types, type];
    onChange({ ...value, types: next });
  }

  return (
    <div className="cal-filters">
      <button type="button" className={calendarFilterActive(value) ? "btn btn-ghost btn-sm active" : "btn btn-ghost btn-sm"} onClick={() => setOpen((o) => !o)}>
        Filtros{calendarFilterActive(value) ? ` (${value.types.length + (value.subjectId ? 1 : 0) + (value.status !== "all" ? 1 : 0)})` : ""}
      </button>
      <select
        aria-label="Filtrar por disciplina"
        value={value.subjectId ?? ""}
        onChange={(e) => onChange({ ...value, subjectId: e.target.value || null })}
      >
        <option value="">Todas as disciplinas</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filtrar por status"
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value as CalendarFilterState["status"] })}
      >
        <option value="all">Todos os status</option>
        <option value="pending">Pendentes</option>
        <option value="done">Concluídos</option>
        <option value="cancelled">Cancelados</option>
      </select>

      {open && (
        <div className="cal-filters-popover">
          <b>Tipo</b>
          {TASK_TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="cal-filter-check">
              <input type="checkbox" checked={value.types.includes(o.value)} onChange={() => toggleType(o.value)} />
              {o.label}
            </label>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(EMPTY_CALENDAR_FILTERS)}>
              Limpar filtros
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
              Mostrar todos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function applyCalendarFilters<T extends { type: string; subjectId: string | null; status: string }>(
  items: T[],
  filters: CalendarFilterState,
): T[] {
  return items.filter((i) => {
    if (filters.types.length > 0 && !filters.types.includes(i.type)) return false;
    if (filters.subjectId && i.subjectId !== filters.subjectId) return false;
    if (filters.status !== "all" && i.status !== filters.status) return false;
    return true;
  });
}
