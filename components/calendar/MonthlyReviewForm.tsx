"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveMonthlyReviewAction, type ActionState } from "@/lib/actions/calendar";

const initialState: ActionState = { error: null };

export function MonthlyReviewForm({ month, monthLabel }: { month: string; monthLabel: string }) {
  const [state, formAction] = useActionState(saveMonthlyReviewAction, initialState);

  return (
    <form action={formAction} className="plan-pillar">
      <input type="hidden" name="month" value={month} />
      <b className="plan-pillar-title">📋 Revisão do mês</b>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
        Como {monthLabel} foi em relação à missão e às metas que você definiu? O que valeu a pena manter
        pro próximo mês?
      </p>
      <div className="field" style={{ marginBottom: 10 }}>
        <textarea name="review" rows={3} placeholder="Escreva sua avaliação do mês" required />
      </div>
      {state.error && <p className="error-text">{state.error}</p>}
      <SubmitButton pendingText="Salvando..." className="btn btn-ghost btn-sm">
        Salvar revisão
      </SubmitButton>
    </form>
  );
}
