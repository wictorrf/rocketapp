"use client";

import { useEffect, useRef, useState } from "react";
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

function countActive(f: CalendarFilterState): number {
  return f.types.length + (f.subjectId ? 1 : 0) + (f.status !== "all" ? 1 : 0);
}

// Botão único "Filtros" — o documento pede que Disciplina/Status não
// ocupem mais espaço permanente no topo. Os controles vivem num popover
// compacto (mesmo padrão de clique-fora do KebabMenu/ProfileMenu) com
// rascunho próprio: só viram filtro de verdade em "Aplicar filtros"
// (fechar clicando fora descarta o rascunho e mantém o que já valia).
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
  const [draft, setDraft] = useState<CalendarFilterState>(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function openPopover() {
    setDraft(value); // começa do que já está aplicado, não do rascunho anterior descartado
    setOpen(true);
  }

  function toggleType(type: string) {
    setDraft((d) => ({ ...d, types: d.types.includes(type) ? d.types.filter((t) => t !== type) : [...d.types, type] }));
  }

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  function clear() {
    onChange(EMPTY_CALENDAR_FILTERS);
    setDraft(EMPTY_CALENDAR_FILTERS);
    setOpen(false);
  }

  return (
    <div className="cal-filters" ref={wrapRef}>
      <button
        type="button"
        className={calendarFilterActive(value) ? "btn btn-ghost btn-sm active" : "btn btn-ghost btn-sm"}
        onClick={() => (open ? setOpen(false) : openPopover())}
      >
        Filtros{calendarFilterActive(value) ? ` (${countActive(value)})` : ""}
      </button>

      {open && (
        <div className="cal-filters-popover">
          <div className="field">
            <label htmlFor="cf-subject">Disciplina</label>
            <select id="cf-subject" value={draft.subjectId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, subjectId: e.target.value || null }))}>
              <option value="">Todas as disciplinas</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="cf-status">Status</label>
            <select id="cf-status" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as CalendarFilterState["status"] }))}>
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="done">Concluídos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>

          <b>Tipo de evento</b>
          {TASK_TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="cal-filter-check">
              <input type="checkbox" checked={draft.types.includes(o.value)} onChange={() => toggleType(o.value)} />
              {o.label}
            </label>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
              Limpar filtros
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={apply}>
              Aplicar filtros
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
