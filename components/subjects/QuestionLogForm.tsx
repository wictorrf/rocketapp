"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { logQuestionsAction, type ActionState } from "@/lib/actions/questions";

const initialState: ActionState = { error: null };

export function QuestionLogForm({ subjectId, topicId }: { subjectId: string; topicId: string }) {
  const [state, formAction] = useActionState(logQuestionsAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="card"
      style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 20 }}
    >
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="topicId" value={topicId} />
      <div className="field" style={{ marginBottom: 0, width: 140 }}>
        <label htmlFor="questionsDone">Questões feitas</label>
        <input id="questionsDone" name="questionsDone" type="number" min={1} required />
      </div>
      <div className="field" style={{ marginBottom: 0, width: 140 }}>
        <label htmlFor="questionsCorrect">Acertos</label>
        <input id="questionsCorrect" name="questionsCorrect" type="number" min={0} required />
      </div>
      <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
        <label htmlFor="note">Nota (opcional)</label>
        <input id="note" name="note" type="text" placeholder="Ex: simulado bloco 2" />
      </div>
      <SubmitButton pendingText="Salvando..." className="btn btn-primary btn-sm">
        Registrar
      </SubmitButton>
      {state.error && <p className="error-text">{state.error}</p>}
    </form>
  );
}
