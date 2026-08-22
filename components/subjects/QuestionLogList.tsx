"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QuestionLogFormPanel } from "./QuestionLogFormPanel";
import { deleteQuestionLogAction } from "@/lib/actions/questions";
import type { QuestionLogRow } from "@/lib/queries/questions";
import { QUESTION_LOG_TYPE_LABEL } from "@/lib/constants/question-log-types";

type SortKey = "recent" | "oldest" | "most_done" | "highest_pct" | "lowest_pct";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
  { value: "most_done", label: "Maior quantidade respondida" },
  { value: "highest_pct", label: "Maior porcentagem de acertos" },
  { value: "lowest_pct", label: "Menor porcentagem de acertos" },
];

function LogRow({ subjectId, topicId, log }: { subjectId: string; topicId: string; log: QuestionLogRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);

  const typeLabel = log.logType === "outro" && log.logTypeCustom ? log.logTypeCustom : QUESTION_LOG_TYPE_LABEL[log.logType];
  const pct = Math.round((log.questionsCorrect / log.questionsDone) * 100);

  async function handleDelete() {
    setPending(true);
    await deleteQuestionLogAction(log.id, subjectId, topicId);
    setPending(false);
    router.refresh();
    setDeleting(false);
  }

  return (
    <div className="qz-log-row">
      <div className="qz-date">{new Date(log.loggedAt).toLocaleDateString("pt-BR")}</div>
      <div>
        {log.questionsDone} questões · {typeLabel}
        {log.note ? ` · ${log.note}` : ""}
      </div>
      <div className="qz-result">
        {log.questionsCorrect}/{log.questionsDone} ({pct}%)
      </div>
      <KebabMenu
        ariaLabel="Mais opções do registro"
        actions={[
          { label: "Editar", onClick: () => setEditing(true) },
          { label: "Duplicar", onClick: () => setDuplicating(true) },
          { label: "Excluir", onClick: () => setDeleting(true), danger: true },
        ]}
      />

      <QuestionLogFormPanel
        mode="edit"
        subjectId={subjectId}
        topicId={topicId}
        logId={log.id}
        initialValues={log}
        open={editing}
        onClose={() => setEditing(false)}
      />
      <QuestionLogFormPanel
        mode="create"
        subjectId={subjectId}
        topicId={topicId}
        initialValues={{ ...log, loggedAt: new Date().toISOString() }}
        open={duplicating}
        onClose={() => setDuplicating(false)}
      />
      {deleting && (
        <ConfirmDialog
          title="Excluir registro de questões"
          description={
            <>
              Isso vai remover <b>{log.questionsDone} questões</b> registradas em{" "}
              <b>{new Date(log.loggedAt).toLocaleDateString("pt-BR")}</b> do Dashboard e das Métricas.
            </>
          }
          confirmLabel="Excluir registro"
          danger
          pending={pending}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}

export function QuestionLogList({
  subjectId,
  topicId,
  logs,
}: {
  subjectId: string;
  topicId: string;
  logs: QuestionLogRow[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = needle
      ? logs.filter(
          (l) =>
            (l.note ?? "").toLowerCase().includes(needle) ||
            QUESTION_LOG_TYPE_LABEL[l.logType].toLowerCase().includes(needle) ||
            (l.logTypeCustom ?? "").toLowerCase().includes(needle),
        )
      : logs;

    return [...base].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.loggedAt.localeCompare(b.loggedAt);
        case "most_done":
          return b.questionsDone - a.questionsDone;
        case "highest_pct":
          return b.questionsCorrect / b.questionsDone - a.questionsCorrect / a.questionsDone;
        case "lowest_pct":
          return a.questionsCorrect / a.questionsDone - b.questionsCorrect / b.questionsDone;
        default:
          return b.loggedAt.localeCompare(a.loggedAt);
      }
    });
  }, [logs, query, sort]);

  if (logs.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
        Nenhuma questão registrada neste assunto ainda.
      </div>
    );
  }

  return (
    <div>
      {logs.length > 5 && (
        <div className="subject-filters">
          <div className="subject-search">
            <span className="subject-search-icon">🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar registro..."
              aria-label="Buscar registro"
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
          <select aria-label="Ordenar por" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          Nenhum registro encontrado.{" "}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuery("")}>
            Limpar busca
          </button>
        </div>
      ) : (
        filtered.map((log) => <LogRow key={log.id} subjectId={subjectId} topicId={topicId} log={log} />)
      )}
    </div>
  );
}
