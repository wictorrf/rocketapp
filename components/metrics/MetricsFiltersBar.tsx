"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MetricsSubjectOption } from "@/lib/queries/metrics";
import { ACTIVITY_TYPES } from "@/lib/timer/pomodoro";

export function MetricsFiltersBar({
  subjects,
  subjectId,
  topicId,
  activityType,
}: {
  subjects: MetricsSubjectOption[];
  subjectId: string | null;
  topicId: string | null;
  activityType: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subjectQuery, setSubjectQuery] = useState("");

  const selectedSubject = subjects.find((s) => s.subjectId === subjectId) ?? null;
  const filteredSubjects = useMemo(() => {
    if (!subjectQuery.trim()) return subjects;
    const q = normalize(subjectQuery);
    return subjects.filter((s) => normalize(s.subjectName).includes(q));
  }, [subjects, subjectQuery]);

  function push(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`/metrics?${params.toString()}`);
  }

  const hasFilters = Boolean(subjectId || topicId || activityType);

  return (
    <div className="metrics-filters">
      <div className="metrics-filter-field">
        {subjects.length > 8 && (
          <input
            type="text"
            className="metrics-filter-search"
            placeholder="Buscar disciplina..."
            value={subjectQuery}
            onChange={(e) => setSubjectQuery(e.target.value)}
            aria-label="Buscar disciplina"
          />
        )}
        <select
          aria-label="Filtrar por disciplina"
          value={subjectId ?? ""}
          onChange={(e) => push({ subjectId: e.target.value || null, topicId: null })}
        >
          <option value="">Todas as disciplinas</option>
          {filteredSubjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.subjectName}
            </option>
          ))}
        </select>
      </div>

      <select
        aria-label="Filtrar por assunto"
        value={topicId ?? ""}
        onChange={(e) => push({ topicId: e.target.value || null })}
        disabled={!selectedSubject}
      >
        <option value="">Todos os assuntos</option>
        {selectedSubject?.topics.map((t) => (
          <option key={t.topicId} value={t.topicId}>
            {t.topicName}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por tipo de atividade"
        value={activityType ?? ""}
        onChange={(e) => push({ activityType: e.target.value || null })}
      >
        <option value="">Todos os tipos de atividade</option>
        {ACTIVITY_TYPES.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => push({ subjectId: null, topicId: null, activityType: null })}>
          Limpar filtros
        </button>
      )}
    </div>
  );
}

function normalize(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
