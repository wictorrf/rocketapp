"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EmojiPickerButton } from "@/components/ui/EmojiPickerButton";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { createTopicAction, updateTopicAction, type TopicActionState } from "@/lib/actions/topics";
import { DEFAULT_ENTITY_COLOR } from "@/lib/constants/entity-colors";
import type { TopicRecord } from "@/lib/queries/topics";

const initialState: TopicActionState = { error: null };

export function TopicFormPanel({
  mode,
  subjectId,
  topic,
  open,
  onClose,
}: {
  mode: "create" | "edit";
  subjectId: string;
  topic?: TopicRecord;
  open: boolean;
  onClose: () => void;
}) {
  const action = mode === "edit" ? updateTopicAction : createTopicAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmDuplicateRef = useRef<HTMLInputElement>(null);
  const hasSubmitted = useRef(false);
  const router = useRouter();

  const [name, setName] = useState(topic?.name ?? "");
  const [emoji, setEmoji] = useState(topic?.emoji ?? "");
  const [color, setColor] = useState(topic?.color ?? DEFAULT_ENTITY_COLOR);
  const [tags, setTags] = useState((topic?.tags ?? []).join(", "));
  const [note, setNote] = useState(topic?.note ?? "");
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
    <div className="modal-overlay" onClick={requestClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>{mode === "edit" ? "Editar assunto" : "Novo assunto"}</h2>
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
          <input type="hidden" name="subjectId" value={subjectId} />
          {mode === "edit" && topic && <input type="hidden" name="topicId" value={topic.id} />}
          <input type="hidden" name="confirmDuplicate" ref={confirmDuplicateRef} defaultValue="0" />

          <div className="field">
            <label htmlFor="topic-name">Nome do assunto</label>
            <input
              id="topic-name"
              name="name"
              type="text"
              placeholder="Ex: Insuficiência cardíaca"
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
            <label>Emoji (opcional)</label>
            <EmojiPickerButton
              value={emoji}
              onChange={(v) => {
                setEmoji(v);
                setDirty(true);
              }}
              name="emoji"
            />
          </div>

          <div className="field">
            <label>Cor (opcional)</label>
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
            <label htmlFor="topic-tags">Etiquetas (opcional, separadas por vírgula)</label>
            <input
              id="topic-tags"
              name="tags"
              type="text"
              placeholder="Ex: prova set, revisar"
              value={tags}
              onChange={(e) => {
                setTags(e.target.value);
                setDirty(true);
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="topic-note">Observação (opcional)</label>
            <textarea
              id="topic-note"
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
                Já existe um assunto chamado <b>{state.duplicate.name}</b> nessa disciplina.
              </p>
              <div className="duplicate-warning-actions">
                <Link
                  href={`/subjects/${subjectId}/topics/${state.duplicate.id}`}
                  className="btn btn-ghost btn-sm"
                >
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

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={requestClose}>
              Cancelar
            </button>
            <SubmitButton pendingText="Salvando..." className="btn btn-primary btn-block">
              Salvar assunto
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
