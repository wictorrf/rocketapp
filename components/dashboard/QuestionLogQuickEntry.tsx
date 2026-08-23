"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { logQuestionsAction, type ActionState } from "@/lib/actions/questions";
import { QUESTION_LOG_TYPE_LABEL, type QuestionLogType } from "@/lib/constants/question-log-types";
import { toLocalDateKey } from "@/lib/utils/format";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

const initialState: ActionState = { error: null };

// Botão + painel autocontidos: ao contrário do QuestionLogFormPanel (usado
// dentro de um assunto, com subjectId/topicId fixos), aqui a pessoa escolhe
// a disciplina e o assunto em cascata, já que o Dashboard não tem esse
// contexto ambiente.
export function QuestionLogQuickEntry({ subjects }: { subjects: SubjectWithTopicsOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-quick" onClick={() => setOpen(true)}>
        + Registrar questões
      </button>
      {open && <QuestionLogQuickForm subjects={subjects} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuestionLogQuickForm({ subjects, onClose }: { subjects: SubjectWithTopicsOption[]; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(logQuestionsAction, initialState);
  const hasSubmitted = useRef(false);
  const router = useRouter();

  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [logType, setLogType] = useState<QuestionLogType>("questoes");

  const topics = useMemo(() => subjects.find((s) => s.id === subjectId)?.topics ?? [], [subjects, subjectId]);

  useEffect(() => {
    if (hasSubmitted.current && !isPending && state.error === null) {
      hasSubmitted.current = false;
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isPending]);

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>Registrar questões</h2>
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
          <div className="field-row">
            <div className="field">
              <label htmlFor="qq-subject">Disciplina</label>
              <select
                id="qq-subject"
                name="subjectId"
                required
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
              <label htmlFor="qq-topic">Assunto</label>
              <select
                id="qq-topic"
                name="topicId"
                required
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={!subjectId}
              >
                <option value="">Selecione</option>
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
              <label htmlFor="qq-date">Data</label>
              <input id="qq-date" name="loggedAt" type="date" required defaultValue={toLocalDateKey(new Date())} />
            </div>
            <div className="field">
              <label htmlFor="qq-type">Tipo de registro</label>
              <select id="qq-type" name="logType" value={logType} onChange={(e) => setLogType(e.target.value as QuestionLogType)}>
                {Object.entries(QUESTION_LOG_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {logType === "outro" && (
            <div className="field">
              <label htmlFor="qq-type-custom">Classificação</label>
              <input id="qq-type-custom" name="logTypeCustom" type="text" required placeholder="Ex: Lista do professor" />
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label htmlFor="qq-done">Questões respondidas</label>
              <input id="qq-done" name="questionsDone" type="number" min={1} required />
            </div>
            <div className="field">
              <label htmlFor="qq-correct">Acertos</label>
              <input id="qq-correct" name="questionsCorrect" type="number" min={0} required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="qq-note">Observação (opcional)</label>
            <input id="qq-note" name="note" type="text" placeholder="Ex: simulado bloco 2" />
          </div>

          {state.error && <p className="error-text">{state.error}</p>}

          <SubmitButton pendingText="Salvando..." className="btn btn-primary btn-block">
            Registrar
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
