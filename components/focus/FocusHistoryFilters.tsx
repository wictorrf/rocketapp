"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Mode } from "@/lib/timer/pomodoro";

const MODE_OPTIONS: { value: Mode | "all"; label: string }[] = [
  { value: "all", label: "Todos os modos" },
  { value: "pomodoro25", label: "25 / 5" },
  { value: "pomodoro50", label: "50 / 10" },
  { value: "simulado", label: "Simulado" },
];

const PERIOD_OPTIONS: { value: "week" | "month" | "all"; label: string }[] = [
  { value: "all", label: "Todo o período" },
  { value: "week", label: "Últimos 7 dias" },
  { value: "month", label: "Últimos 30 dias" },
];

export function FocusHistoryFilters({
  initialQuery,
  initialMode,
  initialPeriod,
}: {
  initialQuery: string;
  initialMode: Mode | "all";
  initialPeriod: "week" | "month" | "all";
}) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(next: { q?: string; mode?: string; period?: string }) {
    const merged = {
      q: next.q ?? query,
      mode: next.mode ?? initialMode,
      period: next.period ?? initialPeriod,
    };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.mode && merged.mode !== "all") params.set("mode", merged.mode);
    if (merged.period && merged.period !== "all") params.set("period", merged.period);
    router.push(`/focus/history${params.toString() ? `?${params.toString()}` : ""}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams({ q: query.trim() });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="subject-filters">
      <div className="subject-search">
        <span className="subject-search-icon">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por disciplina, assunto ou atividade..."
          aria-label="Buscar no histórico"
        />
        {query && (
          <button type="button" className="subject-search-clear" onClick={() => setQuery("")} aria-label="Limpar busca">
            ✕
          </button>
        )}
      </div>

      <select aria-label="Filtrar por modo" value={initialMode} onChange={(e) => pushParams({ mode: e.target.value })}>
        {MODE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select aria-label="Filtrar por período" value={initialPeriod} onChange={(e) => pushParams({ period: e.target.value })}>
        {PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
