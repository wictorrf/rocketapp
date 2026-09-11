"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SubjectStatusFilter, SubjectSortKey } from "@/lib/queries/subjects";

const STATUS_OPTIONS: { value: SubjectStatusFilter; label: string }[] = [
  { value: "active", label: "Ativas" },
  { value: "all", label: "Todas" },
  { value: "archived", label: "Arquivadas" },
  { value: "pending", label: "Com revisões pendentes" },
];

const SORT_OPTIONS: { value: SubjectSortKey; label: string }[] = [
  { value: "name", label: "Nome" },
  { value: "created_desc", label: "Criação mais recente" },
  { value: "last_activity", label: "Última atividade" },
  { value: "studied_minutes", label: "Maior tempo estudado" },
  { value: "topic_count", label: "Maior quantidade de assuntos" },
  { value: "flashcard_count", label: "Maior quantidade de flashcards" },
  { value: "pending_reviews", label: "Maior quantidade de revisões pendentes" },
  { value: "manual", label: "Ordem manual (arrastar e soltar)" },
];

export function SubjectFilters({
  initialQuery,
  initialStatus,
  initialSort,
}: {
  initialQuery: string;
  initialStatus: SubjectStatusFilter;
  initialSort: SubjectSortKey;
}) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    router.push(`/subjects${params.toString() ? `?${params.toString()}` : ""}`);
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
          placeholder="Buscar disciplina..."
          aria-label="Buscar disciplina"
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
