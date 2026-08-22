"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EmojiPickerButton } from "@/components/ui/EmojiPickerButton";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { createSubjectAction, updateSubjectAction, type SubjectActionState } from "@/lib/actions/subjects";
import { DEFAULT_ENTITY_COLOR } from "@/lib/constants/entity-colors";
import type { SubjectRecord } from "@/lib/queries/subjects";

const initialState: SubjectActionState = { error: null };

export function SubjectFormPanel({
  mode,
  subject,
  open,
  onClose,
}: {
  mode: "create" | "edit";
  subject?: SubjectRecord;
  open: boolean;
  onClose: () => void;
}) {
  const action = mode === "edit" ? updateSubjectAction : createSubjectAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmDuplicateRef = useRef<HTMLInputElement>(null);
  const hasSubmitted = useRef(false);
  const router = useRouter();

  const [name, setName] = useState(subject?.name ?? "");
  const [icon, setIcon] = useState(subject?.icon ?? "");
  const [color, setColor] = useState(subject?.color ?? DEFAULT_ENTITY_COLOR);
  const [period, setPeriod] = useState(subject?.period ?? "");
  const [note, setNote] = useState(subject?.note ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (hasSubmitted.current && !isPending && state.error === null && !state.duplicate) {
      hasSubmitted.current = false;
      setDirty(false);
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isPending]);

  function requestClose() {
    if (dirty && !window.confirm("Você tem alterações não salvas. Descartar e fechar?")) return;
    onClose();
  }

  if (!open) return null;

  return (
    <div className="side-panel-overlay" onClick={requestClose}>
      <div className="side-panel-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>{mode === "edit" ? "Editar disciplina" : "Nova disciplina"}</h2>
          <button type="button" className="icon-btn" onClick={requestClose} aria-label="Fechar">
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
          {mode === "edit" && subject && <input type="hidden" name="subjectId" value={subject.id} />}
          <input type="hidden" name="confirmDuplicate" ref={confirmDuplicateRef} defaultValue="0" />

          <div className="field">
            <label htmlFor="subject-name">Nome</label>
            <input
              id="subject-name"
              name="name"
              type="text"
              placeholder="Ex: Cardiologia"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
                if (confirmDuplicateRef.current) confirmDuplicateRef.current.value = "0";
              }}
            />
          </div>

          <div className="field">
            <label>Emoji</label>
            <EmojiPickerButton
              value={icon}
              onChange={(v) => {
                setIcon(v);
                setDirty(true);
              }}
              name="icon"
            />
          </div>

          <div className="field">
            <label>Cor</label>
            <ColorSwatchPicker
              value={color}
              onChange={(v) => {
                setColor(v);
                setDirty(true);
              }}
              name="color"
            />
          </div>

          <div className="field">
            <label htmlFor="subject-period">Período ou semestre (opcional)</label>
            <input
              id="subject-period"
              name="period"
              type="text"
              placeholder="Ex: 6º período"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setDirty(true);
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="subject-note">Observação (opcional)</label>
            <textarea
              id="subject-note"
              name="note"
              rows={2}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setDirty(true);
              }}
            />
          </div>

          {state.duplicate && (
            <div className="duplicate-warning">
              <p>
                Já existe uma disciplina chamada <b>{state.duplicate.name}</b>.
              </p>
              <div className="duplicate-warning-actions">
                <Link href={`/subjects/${state.duplicate.id}/topics`} className="btn btn-ghost btn-sm">
                  Abrir existente
                </Link>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (confirmDuplicateRef.current) confirmDuplicateRef.current.value = "1";
                    formRef.current?.requestSubmit();
                  }}
                >
                  Criar mesmo assim
                </button>
              </div>
            </div>
          )}

          {state.error && <p className="error-text">{state.error}</p>}

          <SubmitButton pendingText="Guardando..." className="btn btn-primary btn-block">
            Guardar disciplina
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
