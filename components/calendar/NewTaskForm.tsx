"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createCalendarTaskAction, type ActionState } from "@/lib/actions/calendar";

const initialState: ActionState = { error: null };

export function NewTaskForm() {
  const [state, formAction] = useActionState(createCalendarTaskAction, initialState);
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
      <div className="field" style={{ marginBottom: 0, width: 180 }}>
        <label htmlFor="type">Tipo</label>
        <select id="type" name="type" defaultValue="prova">
          <option value="prova">Prova/Simulado</option>
          <option value="contato">Primeiro contato</option>
        </select>
      </div>
      <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
        <label htmlFor="title">Título</label>
        <input id="title" name="title" type="text" placeholder="Ex: Simulado bloco 2" required />
      </div>
      <div className="field" style={{ marginBottom: 0, width: 160 }}>
        <label htmlFor="scheduledDate">Data</label>
        <input id="scheduledDate" name="scheduledDate" type="date" required />
      </div>
      <div className="field" style={{ marginBottom: 0, width: 120 }}>
        <label htmlFor="scheduledTime">Horário</label>
        <input id="scheduledTime" name="scheduledTime" type="time" />
      </div>
      <SubmitButton pendingText="Criando..." className="btn btn-primary btn-sm">
        Nova tarefa
      </SubmitButton>
      {state.error && <p className="error-text">{state.error}</p>}
    </form>
  );
}
