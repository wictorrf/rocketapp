"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerQuestionResultAction } from "@/lib/actions/calendar";
import type { CalendarItem } from "@/lib/queries/calendar";

export function QuestionResultForm({ event, onClose }: { event: CalendarItem; onClose: () => void }) {
  const router = useRouter();
  const [questionsDone, setQuestionsDone] = useState(10);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const result = await registerQuestionResultAction(event.id, questionsDone, questionsCorrect, note);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>Registrar resultado</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: -6, marginBottom: 16 }}>{event.title}</p>
        <div className="field">
          <label htmlFor="qrf-done">Questões respondidas</label>
          <input id="qrf-done" type="number" min={1} value={questionsDone} onChange={(e) => setQuestionsDone(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="qrf-correct">Acertos</label>
          <input
            id="qrf-correct"
            type="number"
            min={0}
            value={questionsCorrect}
            onChange={(e) => setQuestionsCorrect(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="qrf-note">Observação (opcional)</label>
          <input id="qrf-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={handleSubmit}>
            {pending ? "Salvando..." : "Registrar resultado"}
          </button>
        </div>
      </div>
    </div>
  );
}
