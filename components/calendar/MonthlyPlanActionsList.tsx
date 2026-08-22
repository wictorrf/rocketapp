"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { createPlanActionAction, setPlanActionStatusAction, deletePlanActionAction } from "@/lib/actions/calendar";
import { PILLAR_LABEL } from "@/lib/constants/pillars";
import { TASK_TYPE_OPTIONS } from "@/lib/constants/calendar";
import type { MonthlyPlanAction } from "@/lib/queries/calendar";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

export function MonthlyPlanActionsList({
  planId,
  actions,
  subjects,
}: {
  planId: string;
  actions: MonthlyPlanAction[];
  subjects: SubjectWithTopicsOption[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const visible = actions.filter((a) => (showArchived ? a.status === "archived" : a.status !== "archived"));

  async function handleStatus(id: string, status: "pending" | "done" | "archived") {
    await setPlanActionStatusAction(id, status);
    router.refresh();
  }

  async function handleDelete(a: MonthlyPlanAction) {
    const alsoDelete = a.calendarTaskId
      ? window.confirm("Essa ação está vinculada a um evento do Calendário. Excluir o evento também?")
      : false;
    await deletePlanActionAction(a.id, alsoDelete);
    router.refresh();
  }

  return (
    <div className="plan-actions-list">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <b>Ações práticas</b>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Nova ação"}
        </button>
      </div>

      {showForm && (
        <PlanActionForm
          planId={planId}
          subjects={subjects}
          onDone={() => {
            setShowForm(false);
            router.refresh();
          }}
        />
      )}

      {visible.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {showArchived ? "Nenhuma ação arquivada." : "Nenhuma ação cadastrada ainda."}
        </p>
      ) : (
        <div className="day-detail-list">
          {visible.map((a) => (
            <div key={a.id} className="day-detail-row">
              <button
                type="button"
                className={`task-check ${a.status === "done" ? "done" : ""}`}
                style={a.color ? { borderColor: a.color, ...(a.status === "done" ? { background: a.color } : {}) } : undefined}
                onClick={() => handleStatus(a.id, a.status === "done" ? "pending" : "done")}
                aria-label={a.status === "done" ? "Marcar como pendente" : "Marcar como concluída"}
              >
                {a.status === "done" ? "✓" : ""}
              </button>
              <div className="dd-body">
                <b style={a.status === "done" ? { textDecoration: "line-through" } : undefined}>{a.title}</b>
                <div className="dd-meta">
                  {a.pillarKey && <span>{PILLAR_LABEL[a.pillarKey] ?? a.pillarKey}</span>}
                  {a.subjectName && <span>{a.subjectName}</span>}
                  {a.scheduledDate && <span>{new Date(`${a.scheduledDate}T00:00:00`).toLocaleDateString("pt-BR")}</span>}
                  {a.calendarTaskId && <span>📅 no Calendário</span>}
                </div>
              </div>
              <KebabMenu
                actions={[
                  a.status !== "archived"
                    ? { label: "Arquivar", onClick: () => handleStatus(a.id, "archived") }
                    : { label: "Restaurar", onClick: () => handleStatus(a.id, "pending") },
                  { label: "Excluir", danger: true, onClick: () => handleDelete(a) },
                ]}
              />
            </div>
          ))}
        </div>
      )}
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowArchived((s) => !s)}>
        {showArchived ? "Ver ações ativas" : "Ver arquivadas"}
      </button>
    </div>
  );
}

function PlanActionForm({
  planId,
  subjects,
  onDone,
}: {
  planId: string;
  subjects: SubjectWithTopicsOption[];
  onDone: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topics = useMemo(() => subjects.find((s) => s.id === subjectId)?.topics ?? [], [subjects, subjectId]);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createPlanActionAction(planId, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form action={handleSubmit} className="plan-action-form">
      <div className="field">
        <label htmlFor="pa-title">Título</label>
        <input id="pa-title" name="title" type="text" required placeholder="Ex: Terminar resumo de Cardiologia" />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="pa-subject">Disciplina (opcional)</label>
          <select id="pa-subject" name="subjectId" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Nenhuma</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pa-topic">Assunto (opcional)</label>
          <select id="pa-topic" name="topicId" disabled={!subjectId}>
            <option value="">Nenhum</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="pa-type">Tipo (opcional)</label>
          <select id="pa-type" name="type" defaultValue="estudo">
            {TASK_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pa-date">Data (opcional)</label>
          <input id="pa-date" name="scheduledDate" type="date" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="pa-note">Observação (opcional)</label>
        <input id="pa-note" name="note" type="text" />
      </div>
      <label className="recurring-toggle">
        <input type="checkbox" name="addToCalendar" checked={addToCalendar} onChange={(e) => setAddToCalendar(e.target.checked)} />
        Adicionar ao Calendário
      </label>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Guardando..." : "Guardar ação"}
      </button>
    </form>
  );
}
