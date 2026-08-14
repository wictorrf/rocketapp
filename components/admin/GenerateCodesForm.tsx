"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { generateCodesAction, type ActionState } from "@/lib/actions/admin";

const initialState: ActionState = { error: null };

export function GenerateCodesForm() {
  const [state, formAction] = useActionState(generateCodesAction, initialState);

  return (
    <form
      action={formAction}
      className="card"
      style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 24 }}
    >
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="quantity">Quantos códigos</label>
        <input id="quantity" name="quantity" type="number" min={1} max={100} defaultValue={10} />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="validDays">Válidos por (dias)</label>
        <input id="validDays" name="validDays" type="number" min={1} max={90} defaultValue={14} />
      </div>
      <SubmitButton pendingText="Gerando..." className="btn btn-primary">
        Gerar códigos
      </SubmitButton>
      {state.error && <p className="error-text">{state.error}</p>}
    </form>
  );
}
