"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createSubjectAction, type ActionState } from "@/lib/actions/subjects";

const initialState: ActionState = { error: null };

export function NewSubjectForm() {
  const [state, formAction] = useActionState(createSubjectAction, initialState);
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
      <div className="field" style={{ marginBottom: 0, width: 70 }}>
        <label htmlFor="icon">Ícone</label>
        <input id="icon" name="icon" type="text" placeholder="📚" maxLength={4} />
      </div>
      <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
        <label htmlFor="name">Nova disciplina</label>
        <input id="name" name="name" type="text" placeholder="Ex: Cardiologia" required />
      </div>
      <SubmitButton pendingText="Criando..." className="btn btn-primary btn-sm">
        Nova disciplina
      </SubmitButton>
      {state.error && <p className="error-text">{state.error}</p>}
    </form>
  );
}
