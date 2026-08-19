"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveMonthlyPlanAction, type ActionState } from "@/lib/actions/calendar";

const initialState: ActionState = { error: null };

export function MonthlyPlanForm({ month, monthLabel }: { month: string; monthLabel: string }) {
  const [state, formAction] = useActionState(saveMonthlyPlanAction, initialState);

  return (
    <form action={formAction} className="card" style={{ marginBottom: 20 }}>
      <input type="hidden" name="month" value={month} />
      <div className="field">
        <label htmlFor="mission">Qual é a missão de {monthLabel}?</label>
        <textarea
          id="mission"
          name="mission"
          rows={3}
          placeholder="Ex: terminar cardiologia, revisar neurologia 2x por semana, fazer 200 questões"
          required
        />
      </div>
      {state.error && <p className="error-text">{state.error}</p>}
      <SubmitButton pendingText="Salvando..." className="btn btn-primary btn-sm">
        Salvar planejamento
      </SubmitButton>
    </form>
  );
}
