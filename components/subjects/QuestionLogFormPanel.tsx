"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { logQuestionsAction, updateQuestionLogAction, type ActionState } from "@/lib/actions/questions";
import type { QuestionLogRow } from "@/lib/queries/questions";
import { QUESTION_LOG_TYPE_LABEL, type QuestionLogType } from "@/lib/constants/question-log-types";
import { toLocalDateKey } from "@/lib/utils/format";

const initialState: ActionState = { error: null };

export function QuestionLogFormPanel({
  mode,
  subjectId,
  topicId,
  logId,
  initialValues,
  open,
  onClose,
}: {
  mode: "create" | "edit";
  subjectId: string;
  topicId: string;
  logId?: string;
  initialValues?: Pick<QuestionLogRow, "questionsDone" | "questionsCorrect" | "note" | "logType" | "logTypeCustom" | "loggedAt">;
  open: boolean;
  onClose: () => void;
}) {
  const action = mode === "edit" ? updateQuestionLogAction : logQuestionsAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const hasSubmitted = useRef(false);
  const router = useRouter();

  const [logType, setLogType] = useState<QuestionLogType>(initialValues?.logType ?? "questoes");

  useEffect(() => {
    if (hasSubmitted.current && !isPending && state.error === null) {
      hasSubmitted.current = false;
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isPending]);

  if (!open) return null;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const defaultDate = initialValues ? toLocalDateKey(new Date(initialValues.loggedAt), timeZone) : toLocalDateKey(new Date(), timeZone);

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>{mode === "edit" ? "Editar registro" : "Registrar questões"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form
          ref={formRef}
          action={(formData) => {
            hasSubmitted.current = true;
            formAction(formData);
          }}
        >
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="topicId" value={topicId} />
          {mode === "edit" && logId && <input type="hidden" name="logId" value={logId} />}

          <div className="field-row">
            <div className="field">
              <label htmlFor="ql-date">Data</label>
              <input id="ql-date" name="loggedAt" type="date" required defaultValue={defaultDate} />
            </div>
            <div className="field">
              <label htmlFor="ql-type">Tipo de registro</label>
              <select
                id="ql-type"
                name="logType"
                value={logType}
                onChange={(e) => setLogType(e.target.value as QuestionLogType)}
              >
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
              <label htmlFor="ql-type-custom">Classificação</label>
              <input
                id="ql-type-custom"
                name="logTypeCustom"
                type="text"
                required
                defaultValue={initialValues?.logTypeCustom ?? ""}
                placeholder="Ex: Lista do professor"
              />
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label htmlFor="ql-done">Questões respondidas</label>
              <input
                id="ql-done"
                name="questionsDone"
                type="number"
                min={1}
                required
                defaultValue={initialValues?.questionsDone}
              />
            </div>
            <div className="field">
              <label htmlFor="ql-correct">Acertos</label>
              <input
                id="ql-correct"
                name="questionsCorrect"
                type="number"
                min={0}
                required
                defaultValue={initialValues?.questionsCorrect}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="ql-note">Observação (opcional)</label>
            <input
              id="ql-note"
              name="note"
              type="text"
              placeholder="Ex: simulado bloco 2"
              defaultValue={initialValues?.note ?? ""}
            />
          </div>

          {state.error && <p className="error-text">{state.error}</p>}

          <SubmitButton pendingText="Salvando..." className="btn btn-primary btn-block">
            {mode === "edit" ? "Guardar alterações" : "Registrar"}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
