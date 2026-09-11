"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TopicStatusFilter, TopicSortKey } from "@/lib/queries/topics";

const STATUS_OPTIONS: { value: TopicStatusFilter; label: string }[] = [
  { value: "active", label: "Ativos" },
  { value: "all", label: "Todos" },
  { value: "archived", label: "Arquivados" },
  { value: "pending", label: "Com revisões pendentes" },
  { value: "with_questions", label: "Com questões registradas" },
];

const SORT_OPTIONS: { value: TopicSortKey; label: string }[] = [
  { value: "name", label: "Nome" },
  { value: "created_desc", label: "Criação mais recente" },
  { value: "last_activity", label: "Última atividade" },
  { value: "studied_minutes", label: "Maior tempo estudado" },
  { value: "flashcard_count", label: "Maior quantidade de flashcards" },
  { value: "pending_reviews", label: "Maior quantidade de revisões pendentes" },
  { value: "manual", label: "Ordem manual (arrastar e soltar)" },
];

export function TopicFilters({
  subjectId,
  initialQuery,
  initialStatus,
  initialSort,
}: {
  subjectId: string;
  initialQuery: string;
  initialStatus: TopicStatusFilter;
  initialSort: TopicSortKey;
}) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const basePath = `/subjects/${subjectId}/topics`;

  function pushParams(next: { q?: string; status?: string; sort?: string }) {
    const merged = {
      q: next.q ?? query,
      status: next.status ?? initialStatus,
      sort: next.sort ?? initialSort,
    };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.status && merged.status !== "active") params.set("status", merged.status);
    if (merged.sort && merged.sort !== "name") params.set("sort", merged.sort);
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
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
          placeholder="Buscar assunto..."
          aria-label="Buscar assunto"
        />
        {query && (
          <button
            type="button"
            className="subject-search-clear"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
          >
            ✕
          </button>
        )}
      </div>

      <select
        aria-label="Filtrar por status"
        value={initialStatus}
        onChange={(e) => pushParams({ status: e.target.value })}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select aria-label="Ordenar por" value={initialSort} onChange={(e) => pushParams({ sort: e.target.value })}>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
