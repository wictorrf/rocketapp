"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createTopicAction, type ActionState } from "@/lib/actions/topics";

const initialState: ActionState = { error: null };

export function NewTopicForm({ subjectId }: { subjectId: string }) {
  const [state, formAction] = useActionState(createTopicAction, initialState);
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
      <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
        <label htmlFor="name">Novo assunto</label>
        <input id="name" name="name" type="text" placeholder="Ex: Insuficiência cardíaca" required />
      </div>
      <SubmitButton pendingText="Criando..." className="btn btn-primary btn-sm">
        Novo assunto
      </SubmitButton>
      {state.error && <p className="error-text">{state.error}</p>}
    </form>
  );
}
