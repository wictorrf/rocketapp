"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createCalendarTaskAction, type ActionState } from "@/lib/actions/calendar";
import {
  TASK_TYPE_OPTIONS,
  COLOR_SWATCHES,
  EMOJI_QUICK_PICKS,
  DEFAULT_COLOR_BY_TYPE,
  WEEKDAY_LABEL_LONG_PT,
} from "@/lib/constants/calendar";

const initialState: ActionState = { error: null };

export function NewEventModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createCalendarTaskAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const hasSubmitted = useRef(false);

  const [type, setType] = useState<string>("prova");
  const [color, setColor] = useState<string>(DEFAULT_COLOR_BY_TYPE.prova);
  const [emoji, setEmoji] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [recurring, setRecurring] = useState(false);

  const weekdayLabel = useMemo(() => {
    if (!date) return "";
    const d = new Date(`${date}T00:00:00`);
    return WEEKDAY_LABEL_LONG_PT[d.getDay()];
  }, [date]);

  function close() {
    setOpen(false);
    formRef.current?.reset();
    setType("prova");
    setColor(DEFAULT_COLOR_BY_TYPE.prova);
    setEmoji("");
    setDate("");
    setRecurring(false);
    hasSubmitted.current = false;
  }

  useEffect(() => {
    if (hasSubmitted.current && !isPending && state.error === null) {
      close();
    }
  }, [state, isPending]);

  if (!open) {
    return (
      <button className="btn btn-primary calendar-fab" onClick={() => setOpen(true)} aria-label="Novo evento">
        + Novo evento
      </button>
    );
  }

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>Novo evento</h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form
          ref={formRef}
          action={(formData) => {
            hasSubmitted.current = true;
            formAction(formData);
          }}
        >
          <div className="field-row">
            <div className="field">
              <label htmlFor="type">Tipo</label>
              <select
                id="type"
                name="type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setColor(DEFAULT_COLOR_BY_TYPE[e.target.value] ?? color);
                }}
              >
                {TASK_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="location">Local (opcional)</label>
              <input id="location" name="location" type="text" placeholder="Ex: Anfiteatro 2" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="title">Título</label>
            <input id="title" name="title" type="text" placeholder="Ex: Aula de Cardiologia" required />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="scheduledDate">Data</label>
              <input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="scheduledTime">Horário (opcional)</label>
              <input id="scheduledTime" name="scheduledTime" type="time" />
            </div>
          </div>

          <div className="field">
            <label>Cor</label>
            <div className="color-swatches">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`swatch ${color === c.value ? "selected" : ""}`}
                  style={{ background: c.value }}
                  aria-label={c.label}
                  onClick={() => setColor(c.value)}
                />
              ))}
            </div>
            <input type="hidden" name="color" value={color} />
          </div>

          <div className="field">
            <label>Emoji (opcional)</label>
            <div className="emoji-picks">
              {EMOJI_QUICK_PICKS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className={`emoji-pick ${emoji === em ? "selected" : ""}`}
                  onClick={() => setEmoji(emoji === em ? "" : em)}
                >
                  {em}
                </button>
              ))}
            </div>
            <input type="hidden" name="emoji" value={emoji} />
          </div>

          <div className="field">
            <label htmlFor="notes">
              {type === "contato"
                ? "O que foi visto nesse primeiro contato? (tema, resumo)"
                : "Notas (opcional)"}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder={
                type === "contato"
                  ? "Ex: introdução à insuficiência cardíaca, classificação NYHA"
                  : "Alguma observação sobre esse evento"
              }
            />
          </div>

          <label className="recurring-toggle">
            <input
              type="checkbox"
              name="recurring"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            {date
              ? `Repetir toda ${weekdayLabel} (próximos 3 meses)`
              : "Repetir semanalmente (escolha a data primeiro)"}
          </label>

          {state.error && <p className="error-text">{state.error}</p>}
          <SubmitButton pendingText="Salvando..." className="btn btn-primary btn-block">
            Salvar evento
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
