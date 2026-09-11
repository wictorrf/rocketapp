"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { logStudySessionAction, type ActionState } from "@/lib/actions/study-sessions";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

const STUDY_TYPE_LABEL: Record<string, string> = {
  primeiro_contato: "Primeiro contato",
  revisao: "Revisão",
  questoes: "Questões",
  outro: "Outro",
};

const initialState: ActionState = { error: null };

export function AddStudySessionModal({
  subjects,
  defaultDate,
  onClose,
}: {
  subjects: SubjectWithTopicsOption[];
  defaultDate: string;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(logStudySessionAction, initialState);
  const hasSubmitted = useRef(false);
  const router = useRouter();
  // Uma chave por abertura do modal — protege contra duplo clique/retry de
  // rede duplicando a sessão (mesmo padrão de ReviewSession.tsx).
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [type, setType] = useState("primeiro_contato");
  // Questões sempre precisa de disciplina/assunto (question_logs exige
  // topic_id) — pros outros tipos o vínculo é realmente opcional.
  const isQuestoes = type === "questoes";
  const [linked, setLinked] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");

  const topics = useMemo(() => subjects.find((s) => s.id === subjectId)?.topics ?? [], [subjects, subjectId]);
  const showLinkFields = isQuestoes || linked;

  useEffect(() => {
    if (hasSubmitted.current && !isPending && state.error === null) {
      hasSubmitted.current = false;
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isPending]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>Adicionar sessão de estudo</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form
          action={(formData) => {
            hasSubmitted.current = true;
            formAction(formData);
          }}
        >
          <div className="field">
            <label htmlFor="ss-type">Tipo de estudo</label>
            <select id="ss-type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(STUDY_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ss-hours">Horas estudadas</label>
              <input id="ss-hours" name="hours" type="number" min={0} max={24} defaultValue={0} />
            </div>
            <div className="field">
              <label htmlFor="ss-minutes">Minutos</label>
              <input id="ss-minutes" name="minutes" type="number" min={0} max={59} defaultValue={30} />
            </div>
            <div className="field">
              <label htmlFor="ss-date">Data</label>
              <input id="ss-date" name="date" type="date" required defaultValue={defaultDate} />
            </div>
          </div>

          {!isQuestoes && (
            <div className="field">
              <label htmlFor="ss-linked">Deseja vincular esta sessão a uma disciplina?</label>
              <select
                id="ss-linked"
                value={linked ? "yes" : "no"}
                onChange={(e) => {
                  setLinked(e.target.value === "yes");
                  setSubjectId("");
                  setTopicId("");
                }}
              >
                <option value="no">Não</option>
                <option value="yes">Sim</option>
              </select>
            </div>
          )}
          <input type="hidden" name="linked" value={showLinkFields ? "yes" : "no"} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

          {showLinkFields && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="ss-subject">Disciplina</label>
                <select
                  id="ss-subject"
                  name="subjectId"
                  required={isQuestoes}
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    setTopicId("");
                  }}
                >
                  <option value="">Selecione</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ss-topic">Assunto</label>
                <select id="ss-topic" name="topicId" required={isQuestoes} value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!subjectId}>
                  <option value="">{isQuestoes ? "Selecione" : "Sem assunto específico"}</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isQuestoes && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="ss-done">Questões respondidas</label>
                <input id="ss-done" name="questionsDone" type="number" min={1} required />
              </div>
              <div className="field">
                <label htmlFor="ss-correct">Acertos</label>
                <input id="ss-correct" name="questionsCorrect" type="number" min={0} required />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="ss-notes">Observações (opcional)</label>
            <input id="ss-notes" name="notes" type="text" placeholder="Ex: revisão de hipertensão portal antes da prova" />
          </div>

          {state.error && <p className="error-text">{state.error}</p>}

          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isPending}>
              Cancelar
            </button>
            <SubmitButton pendingText="Salvando..." className="btn btn-primary">
              Salvar sessão
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
