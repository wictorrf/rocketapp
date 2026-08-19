"use client";

import { useActionState, useRef, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createSubjectAction, type ActionState } from "@/lib/actions/subjects";
import { SUBJECT_ICON_OPTIONS, DEFAULT_SUBJECT_ICON } from "@/lib/constants/subject-icons";

const initialState: ActionState = { error: null };

export function NewSubjectForm() {
  const [state, formAction] = useActionState(createSubjectAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [icon, setIcon] = useState(DEFAULT_SUBJECT_ICON);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
        setIcon(DEFAULT_SUBJECT_ICON);
      }}
      className="card"
      style={{ marginBottom: 20 }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
          <label htmlFor="name">Nova disciplina</label>
          <input id="name" name="name" type="text" placeholder="Ex: Cardiologia" required />
        </div>
        <SubmitButton pendingText="Criando..." className="btn btn-primary btn-sm">
          Nova disciplina
        </SubmitButton>
      </div>

      <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
        <label>Ícone da disciplina</label>
        <div className="emoji-picks">
          {SUBJECT_ICON_OPTIONS.map((em) => (
            <button
              key={em}
              type="button"
              className={`emoji-pick ${icon === em ? "selected" : ""}`}
              onClick={() => setIcon(em)}
            >
              {em}
            </button>
          ))}
        </div>
        <input type="hidden" name="icon" value={icon} />
      </div>

      {state.error && <p className="error-text">{state.error}</p>}
    </form>
  );
}
