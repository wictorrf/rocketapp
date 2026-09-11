"use client";

import { useEffect, useMemo, useState } from "react";
import { startMixedReviewSessionAction } from "@/lib/actions/review";
import { searchFlashcardsByContentAction } from "@/lib/actions/flashcards";
import type { TopicHubSummary, FlashcardHubEvolution } from "@/lib/queries/review";
import { estimateReviewMinutes } from "@/lib/srs/fsrs";
import { FlashcardsHubTopicCard } from "./FlashcardsHubTopicCard";
import { FlashcardsHubCharts } from "./FlashcardsHubCharts";
import { FlashcardForm } from "./FlashcardForm";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";
import type { StageDistribution } from "@/lib/queries/metrics";
import type { DayBar } from "@/lib/metrics/calc";

const FILTERS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "revisar_hoje", label: "Revisar hoje" },
  { value: "atrasado", label: "Atrasados" },
  { value: "novo", label: "Novos" },
  { value: "aprendendo", label: "Em aprendizagem" },
  { value: "revisao", label: "Em revisão" },
  { value: "reaprendizagem", label: "Em reaprendizagem" },
  { value: "suspenso", label: "Suspensos" },
  { value: "consolidado", label: "Consolidados" },
  { value: "precisa_reforco", label: "Precisam de reforço" },
  { value: "em_dia", label: "Em dia" },
];

const SORTS: { value: string; label: string }[] = [
  { value: "urgencia", label: "Maior urgência" },
  { value: "atrasados", label: "Mais atrasados" },
  { value: "novos", label: "Mais novos" },
  { value: "alfabetica", label: "Nome" },
  { value: "disciplina", label: "Disciplina" },
  { value: "recente", label: "Atividade recente" },
];

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function sortSummaries(list: TopicHubSummary[], sortBy: string): TopicHubSummary[] {
  const copy = [...list];
  switch (sortBy) {
    case "atrasados":
      return copy.sort((a, b) => b.overdueCount - a.overdueCount);
    case "novos":
      return copy.sort((a, b) => b.newCount - a.newCount);
    case "disciplina":
      return copy.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "pt-BR") || a.topicName.localeCompare(b.topicName, "pt-BR"));
    case "alfabetica":
      return copy.sort((a, b) => a.topicName.localeCompare(b.topicName, "pt-BR"));
    case "recente":
      return copy.sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""));
    case "urgencia":
    default:
      return copy.sort((a, b) => {
        if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
        const recA = a.worstRecuperability ?? 1;
        const recB = b.worstRecuperability ?? 1;
        if (recA !== recB) return recA - recB;
        return b.dueTodayCount - a.dueTodayCount;
      });
  }
}

export function FlashcardsHubShell({
  summaries,
  subjects,
  evolution,
  upcomingLoad,
  stageDistribution,
}: {
  summaries: TopicHubSummary[];
  subjects: SubjectWithTopicsOption[];
  evolution: FlashcardHubEvolution;
  upcomingLoad: DayBar[];
  stageDistribution: StageDistribution;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("urgencia");
  const [showCreate, setShowCreate] = useState(false);
  const [contentMatches, setContentMatches] = useState<Set<string> | null>(null);

  const totals = useMemo(
    () =>
      summaries.reduce(
        (acc, s) => ({
          overdue: acc.overdue + s.overdueCount,
          dueToday: acc.dueToday + s.dueTodayCount,
          newCards: acc.newCards + s.newCount,
          learning: acc.learning + s.learningCount,
        }),
        { overdue: 0, dueToday: 0, newCards: 0, learning: 0 },
      ),
    [summaries],
  );
  const totalPending = totals.overdue + totals.dueToday + totals.newCards;

  // Busca por conteúdo (pergunta/resposta/etiqueta) via server action,
  // debounced — disciplina/assunto já são filtrados no cliente abaixo, sem
  // precisar de round-trip, porque a lista de assuntos já está carregada.
  useEffect(() => {
    const needle = search.trim();
    // Busca vazia não precisa limpar contentMatches: o filtro abaixo já
    // ignora esse valor quando needle está vazio (evita setState síncrono
    // no corpo do efeito).
    if (!needle) return;
    const handle = setTimeout(() => {
      searchFlashcardsByContentAction(needle).then((topicIds) => setContentMatches(new Set(topicIds)));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const filtered = useMemo(() => {
    const needle = normalize(search.trim());
    return summaries.filter((s) => {
      if (statusFilter !== "todos" && !s.statuses.includes(statusFilter as TopicHubSummary["statuses"][number])) return false;
      if (!needle) return true;
      const matchesName = normalize(s.topicName).includes(needle) || normalize(s.subjectName).includes(needle);
      const matchesContent = contentMatches?.has(s.topicId) ?? false;
      return matchesName || matchesContent;
    });
  }, [summaries, search, statusFilter, contentMatches]);

  const sorted = useMemo(() => sortSummaries(filtered, sortBy), [filtered, sortBy]);

  return (
    <div className="flashcards-page">
      <div className="fc-hub-header">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          Flashcards
        </h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          + Novo flashcard
        </button>
      </div>
      <p className="muted-note" style={{ marginBottom: 16 }}>
        Revise com inteligência, acompanhe sua retenção e transforme repetição em memória de longo prazo.
      </p>

      <div className="fc-hero-banner">
        <span className="icon" aria-hidden>
          🚀
        </span>
        <p>
          Em vez de revisar no achismo, o Rocket organiza tudo por você. Os flashcards aparecem no momento certo, com
          base no seu desempenho, para te ajudar a fixar melhor o conteúdo e estudar com muito mais estratégia.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="eyebrow">Revisar hoje</div>
        {totalPending === 0 ? (
          <div className="stat-num" style={{ fontSize: 20 }}>
            Você está em dia com suas revisões
          </div>
        ) : (
          <>
            <div className="review-highlight-counts" style={{ marginTop: 12 }}>
              <div className="rh-overdue">
                <b>{totals.overdue}</b>
                <span>atrasados</span>
              </div>
              <div className="rh-today">
                <b>{totals.dueToday}</b>
                <span>hoje</span>
              </div>
              <div className="rh-new">
                <b>{totals.newCards}</b>
                <span>novos</span>
              </div>
            </div>
            <p className="muted-note" style={{ margin: "10px 0 16px" }}>
              ~{estimateReviewMinutes(totalPending)} min estimados para {totalPending} {totalPending === 1 ? "cartão" : "cartões"}
            </p>
            <form action={startMixedReviewSessionAction}>
              <button type="submit" className="btn btn-primary">
                Revisar tudo misturado
              </button>
            </form>
          </>
        )}
      </div>

      {summaries.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ marginBottom: 14 }}>Você ainda não criou nenhum flashcard.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            Criar primeiro flashcard
          </button>
        </div>
      ) : (
        <>
          <div className="checklist-toolbar">
            <input
              type="search"
              placeholder="Buscar assunto ou flashcard..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrar por status">
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar por">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {sorted.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
              Nenhum assunto encontrado com esse filtro.
            </div>
          ) : (
            <div className="fc-list">
              {sorted.map((s) => (
                <FlashcardsHubTopicCard key={s.topicId} summary={s} />
              ))}
            </div>
          )}

          <div style={{ height: 28 }} />
          <FlashcardsHubCharts evolution={evolution} upcomingLoad={upcomingLoad} stageDistribution={stageDistribution} />
        </>
      )}

      <FlashcardForm open={showCreate} onClose={() => setShowCreate(false)} subjects={subjects} />
    </div>
  );
}
