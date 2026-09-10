"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { EmojiPickerButton } from "@/components/ui/EmojiPickerButton";
import { EditScopeDialog } from "./EditScopeDialog";
import { DeleteEventDialog } from "./DeleteEventDialog";
import { createCalendarEventAction, updateCalendarEventAction, getSeriesOccurrenceCountsAction } from "@/lib/actions/calendar";
import { TASK_TYPE_OPTIONS, REPEAT_OPTIONS, DEFAULT_COLOR_BY_TYPE, type CalendarTaskType } from "@/lib/constants/calendar";
import { DEFAULT_ENTITY_COLOR } from "@/lib/constants/entity-colors";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";
import type { CalendarItem } from "@/lib/queries/calendar";

const WEEKDAY_TOGGLES = [
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

export function EventFormPanel({
  open,
  onClose,
  subjects,
  event,
  defaultDate,
  defaultStartTime,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectWithTopicsOption[];
  event?: CalendarItem | null;
  defaultDate?: string;
  defaultStartTime?: string;
}) {
  const router = useRouter();
  const mode = event ? "edit" : "create";
  const formRef = useRef<HTMLFormElement>(null);

  const [type, setType] = useState<CalendarTaskType>(event?.type ?? "estudo");
  const [typeCustom, setTypeCustom] = useState(event?.typeCustom ?? "");
  const [title, setTitle] = useState(event?.title ?? "");
  const [subjectId, setSubjectId] = useState(event?.subjectId ?? "");
  const [topicId, setTopicId] = useState(event?.topicId ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [scheduledDate, setScheduledDate] = useState(event?.scheduledDate ?? defaultDate ?? "");
  const [endDate, setEndDate] = useState(event?.endDate ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startTime, setStartTime] = useState(event?.startTime ?? defaultStartTime ?? "");
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [color, setColor] = useState(event?.color ?? DEFAULT_COLOR_BY_TYPE[type] ?? DEFAULT_ENTITY_COLOR);
  const [emoji, setEmoji] = useState(event?.emoji ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [showInChecklist, setShowInChecklist] = useState(event?.showInChecklist ?? true);
  const [repeatFrequency, setRepeatFrequency] = useState<"none" | "daily" | "weekly" | "monthly" | "custom">("none");
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [repeatCount, setRepeatCount] = useState("");

  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [scopeCounts, setScopeCounts] = useState<{ future: number; total: number } | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const topics = useMemo(() => subjects.find((s) => s.id === subjectId)?.topics ?? [], [subjects, subjectId]);

  function requestClose() {
    if (dirty && !window.confirm("Você tem alterações não salvas. Descartar e fechar?")) return;
    onClose();
  }

  function mark<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  function toggleWeekday(day: number) {
    setRepeatWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
    setDirty(true);
  }

  async function submit(scope: "this" | "future" | "all") {
    if (!formRef.current) return;
    setShowScopeDialog(false);
    setPending(true);
    setError(null);
    const formData = new FormData(formRef.current);
    const result =
      mode === "edit"
        ? await updateCalendarEventAction(event!.id, scope, { error: null }, formData)
        : await createCalendarEventAction({ error: null }, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDirty(false);
    router.refresh();
    onClose();
  }

  function handleSaveClick(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "edit" && event?.recurrenceGroupId) {
      setScopeCounts(null);
      setShowScopeDialog(true);
      getSeriesOccurrenceCountsAction(event.recurrenceGroupId, event.scheduledDate).then(setScopeCounts);
      return;
    }
    submit("this");
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={requestClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>{mode === "edit" ? "Editar evento" : "Novo evento"}</h2>
          <button type="button" className="icon-btn" onClick={requestClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSaveClick}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-type">Tipo</label>
              <select
                id="ev-type"
                name="type"
                value={type}
                onChange={(e) => {
                  const next = e.target.value as CalendarTaskType;
                  mark(setType)(next);
                  if (!event) mark(setColor)(DEFAULT_COLOR_BY_TYPE[next]);
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
              <label htmlFor="ev-location">Local (opcional)</label>
              <input
                id="ev-location"
                name="location"
                type="text"
                placeholder="Ex: Anfiteatro 2"
                value={location}
                onChange={(e) => mark(setLocation)(e.target.value)}
              />
            </div>
          </div>

          {type === "outro" && (
            <div className="field">
              <label htmlFor="ev-type-custom">Descreva o tipo</label>
              <input
                id="ev-type-custom"
                name="typeCustom"
                type="text"
                required
                value={typeCustom}
                onChange={(e) => mark(setTypeCustom)(e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="ev-title">Título</label>
            <input
              id="ev-title"
              name="title"
              type="text"
              placeholder="Ex: Aula de Cardiologia"
              required
              value={title}
              onChange={(e) => mark(setTitle)(e.target.value)}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-subject">Disciplina (opcional)</label>
              <select
                id="ev-subject"
                name="subjectId"
                value={subjectId}
                onChange={(e) => {
                  mark(setSubjectId)(e.target.value);
                  setTopicId("");
                }}
              >
                <option value="">Nenhuma</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ev-topic">Assunto (opcional)</label>
              <select
                id="ev-topic"
                name="topicId"
                value={topicId}
                onChange={(e) => mark(setTopicId)(e.target.value)}
                disabled={!subjectId}
              >
                <option value="">Nenhum</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-date">Data de início</label>
              <input
                id="ev-date"
                name="scheduledDate"
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => mark(setScheduledDate)(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="ev-end-date">Data de término (se necessário)</label>
              <input
                id="ev-end-date"
                name="endDate"
                type="date"
                value={endDate}
                onChange={(e) => mark(setEndDate)(e.target.value)}
              />
            </div>
          </div>

          <label className="recurring-toggle">
            <input
              type="checkbox"
              name="allDay"
              checked={allDay}
              onChange={(e) => mark(setAllDay)(e.target.checked)}
            />
            Evento de dia inteiro
          </label>

          {!allDay && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="ev-start-time">Hora de início</label>
                <input
                  id="ev-start-time"
                  name="startTime"
                  type="time"
                  required={!allDay}
                  value={startTime}
                  onChange={(e) => mark(setStartTime)(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="ev-end-time">Hora de término</label>
                <input
                  id="ev-end-time"
                  name="endTime"
                  type="time"
                  required={!allDay}
                  value={endTime}
                  onChange={(e) => mark(setEndTime)(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="field">
            <label>Cor</label>
            <ColorSwatchPicker value={color} onChange={mark(setColor)} name="color" />
          </div>

          <div className="field">
            <label>Emoji (opcional)</label>
            <EmojiPickerButton value={emoji} onChange={mark(setEmoji)} name="emoji" />
          </div>

          <div className="field">
            <label htmlFor="ev-notes">Notas (opcional)</label>
            <textarea id="ev-notes" name="notes" rows={2} value={notes} onChange={(e) => mark(setNotes)(e.target.value)} />
          </div>

          <label className="recurring-toggle">
            <input
              type="checkbox"
              name="showInChecklist"
              checked={showInChecklist}
              onChange={(e) => mark(setShowInChecklist)(e.target.checked)}
            />
            Mostrar no checklist do Dashboard
          </label>

          {mode === "create" && (
            <div className="field">
              <label htmlFor="ev-repeat">Repetição</label>
              <select
                id="ev-repeat"
                name="repeatFrequency"
                value={repeatFrequency}
                onChange={(e) => mark(setRepeatFrequency)(e.target.value as typeof repeatFrequency)}
              >
                {REPEAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {(repeatFrequency === "weekly" || repeatFrequency === "custom") && (
                <div className="weekday-toggle-row">
                  {WEEKDAY_TOGGLES.map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      className={repeatWeekdays.includes(w.value) ? "wd-toggle active" : "wd-toggle"}
                      onClick={() => toggleWeekday(w.value)}
                    >
                      {w.label}
                    </button>
                  ))}
                  <input type="hidden" name="repeatWeekdays" value={repeatWeekdays.join(",")} />
                </div>
              )}

              {repeatFrequency === "custom" && (
                <div className="field-row" style={{ marginTop: 10 }}>
                  <div className="field">
                    <label htmlFor="ev-repeat-until">Repetir até (opcional)</label>
                    <input
                      id="ev-repeat-until"
                      name="repeatUntil"
                      type="date"
                      value={repeatUntil}
                      onChange={(e) => mark(setRepeatUntil)(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="ev-repeat-count">Ou nº de ocorrências (opcional)</label>
                    <input
                      id="ev-repeat-count"
                      name="repeatCount"
                      type="number"
                      min={1}
                      value={repeatCount}
                      onChange={(e) => mark(setRepeatCount)(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {repeatFrequency !== "none" && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  {repeatFrequency === "custom" && (repeatUntil || repeatCount)
                    ? "A série continua até a data ou quantidade escolhida."
                    : "A série continua até você excluí-la — sem limite automático."}
                </p>
              )}
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
              {pending ? "Guardando..." : mode === "edit" ? "Salvar alterações" : "Guardar evento"}
            </button>
            {mode === "edit" && (
              <button type="button" className="btn btn-danger" disabled={pending} onClick={() => setShowDelete(true)}>
                Excluir
              </button>
            )}
          </div>
        </form>
      </div>

      {showScopeDialog && (
        <EditScopeDialog
          kind="edit"
          counts={scopeCounts}
          onChoose={(scope) => submit(scope)}
          onCancel={() => setShowScopeDialog(false)}
          pending={pending}
        />
      )}

      {showDelete && event && <DeleteEventDialog event={event} onClose={onClose} />}
    </div>
  );
}
