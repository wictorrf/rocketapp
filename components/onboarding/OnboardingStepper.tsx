"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  saveOnboardingAction,
  skipOnboardingAction,
  type ActionState,
} from "@/lib/actions/profile";
import { ONBOARDING_QUESTIONS } from "@/lib/constants/onboarding-questions";

const initialState: ActionState = { error: null };
const TOTAL = ONBOARDING_QUESTIONS.length;

export function OnboardingStepper() {
  const [state, formAction] = useActionState(saveOnboardingAction, initialState);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = ONBOARDING_QUESTIONS[step];
  const isLast = step === TOTAL - 1;

  return (
    <div className="getknow-wrap">
      <div className="getknow-box">
        <div className="gk-top">
          <button
            type="button"
            className="gk-back"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            style={{ visibility: step === 0 ? "hidden" : "visible", border: "none" }}
            aria-label="Voltar"
          >
            ‹
          </button>
          <form action={skipOnboardingAction}>
            <button type="submit" className="gk-skip" style={{ border: "none", background: "none" }}>
              Pular por enquanto
            </button>
          </form>
        </div>

        <div className="step-track">
          <div className="fill-line" style={{ width: `${(step / (TOTAL - 1)) * 100}%` }} />
          {ONBOARDING_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`step-dot ${i < step ? "done" : ""} ${i === step ? "current" : ""}`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <form action={formAction}>
          {ONBOARDING_QUESTIONS.map((q) =>
            answers[q.column] ? (
              <input key={q.column} type="hidden" name={q.column} value={answers[q.column]} />
            ) : null,
          )}

          <div className="gk-qcount">
            Pergunta {step + 1} de {TOTAL}
          </div>
          <div className="gk-question">{current.question}</div>
          <div>
            {current.options.map((opt) => (
              <button
                type="button"
                key={opt.key}
                className={`opt-card ${answers[current.column] === opt.key ? "selected" : ""}`}
                onClick={() => setAnswers((a) => ({ ...a, [current.column]: opt.key }))}
              >
                <div className="oc-icon">{opt.icon}</div>
                <div className="oc-text">
                  <b>{opt.title}</b>
                  <span>{opt.subtitle}</span>
                </div>
              </button>
            ))}
          </div>

          {state.error && <p className="error-text">{state.error}</p>}

          <div className="gk-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              style={{ visibility: step === 0 ? "hidden" : "visible" }}
            >
              Voltar
            </button>
            {isLast ? (
              <SubmitButton pendingText="Concluindo..." className="btn btn-primary">
                Concluir
              </SubmitButton>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!answers[current.column]}
                onClick={() => setStep((s) => Math.min(TOTAL - 1, s + 1))}
              >
                Próximo
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
