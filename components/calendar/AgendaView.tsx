"use client";

import { useEffect, useState } from "react";
import { EventRow } from "./EventRow";
import { searchCalendarEventsAction } from "@/lib/actions/calendar";
import type { CalendarItem } from "@/lib/queries/calendar";

const WEEKDAY_LONG = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function formatFullDate(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function AgendaView({
  anchorDateKey,
  items,
  isSpecificDay,
  onEdit,
  onBackToUpcoming,
  onCreate,
}: {
  anchorDateKey: string | null;
  items: CalendarItem[];
  isSpecificDay: boolean;
  onEdit: (item: CalendarItem) => void;
  onBackToUpcoming: () => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [searchAll, setSearchAll] = useState(false);
  const [results, setResults] = useState<CalendarItem[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults(null);
        return;
      }
      setSearching(true);
      const found = await searchCalendarEventsAction(query, searchAll);
      setResults(found);
      setSearching(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, searchAll]);

  return (
    <div className="agenda-view">
      <div className="agenda-search-row">
        <div className="subject-search">
          <span className="subject-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar evento..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar evento"
          />
          {query && (
            <button type="button" className="subject-search-clear" onClick={() => setQuery("")} aria-label="Limpar busca">
              ✕
            </button>
          )}
        </div>
        {query.trim() && (
          <label className="cal-filter-check" style={{ marginLeft: 12 }}>
            <input type="checkbox" checked={searchAll} onChange={(e) => setSearchAll(e.target.checked)} />
            Buscar em todos os eventos
          </label>
        )}
      </div>

      {results !== null ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
            {searching ? "Buscando..." : `${results.length} resultado${results.length === 1 ? "" : "s"}`}
          </p>
          {results.length === 0 && !searching ? (
            <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
              Nenhum registro encontrado.
            </div>
          ) : (
            <div className="day-detail-list">
              {results.map((item) => (
                <EventRow key={item.id} item={item} onEdit={onEdit} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {isSpecificDay && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={onBackToUpcoming}>
              ‹ Voltar para os próximos eventos
            </button>
          )}

          {anchorDateKey ? (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 2 }}>{formatFullDate(anchorDateKey)}</p>
              <h2 className="section-title" style={{ marginBottom: 14 }}>
                {WEEKDAY_LONG[new Date(`${anchorDateKey}T00:00:00`).getDay()]}
              </h2>
              {items.length === 0 ? (
                <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  Nada programado pra esse dia.
                </div>
              ) : (
                <div className="day-detail-list">
                  {items.map((item) => (
                    <EventRow key={item.id} item={item} onEdit={onEdit} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 16 }}>
              <p style={{ marginBottom: 12 }}>Nenhum próximo evento encontrado.</p>
              <button type="button" className="btn btn-pink btn-sm" onClick={onCreate}>
                Criar evento
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
