"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveMonthlyPlanAction, type ActionState } from "@/lib/actions/calendar";
import { PILLAR_OPTIONS, MAX_PILLARS } from "@/lib/constants/pillars";
import type { MonthlyPlanGoals } from "@/lib/queries/calendar";

const initialState: ActionState = { error: null };

export function MonthlyPlanForm({
  month,
  monthLabel,
  existingGoals,
  onSaved,
}: {
  month: string;
  monthLabel: string;
  existingGoals?: MonthlyPlanGoals;
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState(saveMonthlyPlanAction, initialState);
  const [selected, setSelected] = useState<string[]>(existingGoals?.pillars.map((p) => p.key) ?? []);
  const [mission, setMission] = useState(existingGoals?.mission ?? "");
  const [customPillarLabel, setCustomPillarLabel] = useState(
    existingGoals?.pillars.find((p) => p.key === "outro")?.customLabel ?? "",
  );

  function togglePillar(key: string) {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_PILLARS) return prev;
      return [...prev, key];
    });
  }

  function pillarDefault(key: string) {
    return existingGoals?.pillars.find((p) => p.key === key);
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onSaved?.();
      }}
      className="card"
      style={{ marginBottom: 20 }}
    >
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
          value={mission}
          onChange={(e) => setMission(e.target.value)}
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

      {selected.includes("outro") && (
        <div className="field">
          <label htmlFor="customPillarLabel">Nome do pilar personalizado</label>
          <input
            id="customPillarLabel"
            name="customPillarLabel"
            type="text"
            required
            value={customPillarLabel}
            onChange={(e) => setCustomPillarLabel(e.target.value)}
          />
        </div>
      )}

      {selected.length > 0 && (
        <div className="pillar-detail-list">
          {selected.map((key) => {
            // Pilares são salvos por key num jsonb, sem checagem no banco —
            // um planejamento antigo pode referenciar uma key que não existe
            // mais em PILLAR_OPTIONS (ex: lista de pilares foi alterada).
            const pillar = PILLAR_OPTIONS.find((p) => p.key === key) ?? { key, label: key, emoji: "🎯" };
            const existing = pillarDefault(key);
            return (
              <div key={key} className="pillar-detail-card">
                <b>
                  {pillar.emoji} {key === "outro" ? customPillarLabel || "Outro" : pillar.label}
                </b>
                <div className="field">
                  <label htmlFor={`purpose_${key}`}>Propósito</label>
                  <input
                    id={`purpose_${key}`}
                    name={`purpose_${key}`}
                    type="text"
                    placeholder="Ex: Me sentir mais confiante"
                    required
                    defaultValue={existing?.purpose}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor={`metas_${key}`}>Metas (uma por linha)</label>
                  <textarea
                    id={`metas_${key}`}
                    name={`metas_${key}`}
                    rows={3}
                    placeholder={"Me alimentar melhor\nTreinar\nSer aprovada nas finais"}
                    defaultValue={existing?.metas?.join("\n")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {state.error && <p className="error-text">{state.error}</p>}
      <SubmitButton pendingText="Salvando..." className="btn btn-primary btn-sm">
        Guardar planejamento
      </SubmitButton>
    </form>
  );
}
