"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveMonthlyPlanAction, type ActionState } from "@/lib/actions/calendar";
import { PILLAR_OPTIONS, MAX_PILLARS } from "@/lib/constants/pillars";

const initialState: ActionState = { error: null };

export function MonthlyPlanForm({ month, monthLabel }: { month: string; monthLabel: string }) {
  const [state, formAction] = useActionState(saveMonthlyPlanAction, initialState);
  const [selected, setSelected] = useState<string[]>([]);

  function togglePillar(key: string) {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_PILLARS) return prev;
      return [...prev, key];
    });
  }

  return (
    <form action={formAction} className="card" style={{ marginBottom: 20 }}>
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="selectedPillars" value={selected.join(",")} />

      <div className="field">
        <label htmlFor="mission">Qual é a missão de {monthLabel}?</label>
        <textarea
          id="mission"
          name="mission"
          rows={2}
          placeholder="Ex: terminar cardiologia, revisar neurologia 2x por semana, fazer 200 questões"
          required
        />
      </div>

      <div className="field">
        <label>
          Os pilares do seu mês — escolha até {MAX_PILLARS} ({selected.length}/{MAX_PILLARS})
        </label>
        <div className="pillar-grid">
          {PILLAR_OPTIONS.map((p) => {
            const isSelected = selected.includes(p.key);
            const disabled = !isSelected && selected.length >= MAX_PILLARS;
            return (
              <button
                type="button"
                key={p.key}
                className={`pillar-chip ${isSelected ? "selected" : ""}`}
                onClick={() => togglePillar(p.key)}
                disabled={disabled}
              >
                <span className="pillar-emoji">{p.emoji}</span>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="pillar-detail-list">
          {selected.map((key) => {
            const pillar = PILLAR_OPTIONS.find((p) => p.key === key)!;
            return (
              <div key={key} className="pillar-detail-card">
                <b>
                  {pillar.emoji} {pillar.label}
                </b>
                <div className="field">
                  <label htmlFor={`purpose_${key}`}>Propósito</label>
                  <input
                    id={`purpose_${key}`}
                    name={`purpose_${key}`}
                    type="text"
                    placeholder="Ex: Me sentir mais confiante"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`objectives_${key}`}>Objetivos ou metas (um por linha)</label>
                  <textarea
                    id={`objectives_${key}`}
                    name={`objectives_${key}`}
                    rows={3}
                    placeholder={"Me alimentar melhor\nTreinar\nAumentar meu conhecimento na área de atuação"}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor={`mainGoal_${key}`}>Meta principal desse pilar pro mês</label>
                  <input
                    id={`mainGoal_${key}`}
                    name={`mainGoal_${key}`}
                    type="text"
                    placeholder="Ex: Ser aprovada nas finais"
                    required
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {state.error && <p className="error-text">{state.error}</p>}
      <SubmitButton pendingText="Salvando..." className="btn btn-primary btn-sm">
        Salvar planejamento
      </SubmitButton>
    </form>
  );
}
