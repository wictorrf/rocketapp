"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { createFlashcardAction, updateFlashcardAction, type FlashcardActionState } from "@/lib/actions/flashcards";
import type { FlashcardForEdit } from "@/lib/queries/flashcards";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

const initialState: FlashcardActionState = { error: null };

export function FlashcardForm({
  open,
  onClose,
  subjects,
  defaultSubjectId,
  defaultTopicId,
  flashcard,
}: {
  open: boolean;
  onClose: () => void;
  subjects: SubjectWithTopicsOption[];
  defaultSubjectId?: string;
  defaultTopicId?: string;
  flashcard?: FlashcardForEdit;
}) {
  const isEdit = Boolean(flashcard);
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(isEdit ? updateFlashcardAction : createFlashcardAction, initialState);
  const hasSubmitted = useRef(false);

  // Sucesso de verdade: já foi submetido, terminou de processar, sem erro e
  // sem aviso de duplicidade pendente (que também chega como error: null,
  // mas ainda precisa de uma decisão da pessoa antes de salvar).
  useEffect(() => {
    if (hasSubmitted.current && !isPending && state.error === null && !state.duplicate) {
      hasSubmitted.current = false;
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isPending]);

  const [subjectId, setSubjectId] = useState(flashcard?.subjectId ?? defaultSubjectId ?? "");
  const [topicId, setTopicId] = useState(flashcard?.topicId ?? defaultTopicId ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(flashcard?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [backImagePreview, setBackImagePreview] = useState<string | null>(flashcard?.backImageUrl ?? null);
  const [removeBackImage, setRemoveBackImage] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  const topics = useMemo(() => subjects.find((s) => s.id === subjectId)?.topics ?? [], [subjects, subjectId]);
  const topicName = topics.find((t) => t.id === topicId)?.name ?? "";

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (side === "front") {
        setImagePreview(dataUrl);
        setRemoveImage(false);
      } else {
        setBackImagePreview(dataUrl);
        setRemoveBackImage(false);
      }
    };
    reader.readAsDataURL(file);
  }

  if (!open) return null;

  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>{isEdit ? "Editar flashcard" : "Novo flashcard"}{topicName ? ` · ${topicName}` : ""}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        {state.duplicate && !confirmDuplicate && (
          <div className="duplicate-warning">
            <p>
              Já existe um cartão parecido nesse assunto: <b>“{state.duplicate.frontPreview}”</b>
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <Link href={`/subjects/${subjectId}/topics/${topicId}/flashcards/${state.duplicate.id}/edit`} className="btn btn-ghost btn-sm">
                Ver cartão existente
              </Link>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirmDuplicate(true)}>
                Continuar criação
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <form
          action={(formData) => {
            hasSubmitted.current = true;
            formAction(formData);
          }}
        >
          {isEdit && <input type="hidden" name="flashcardId" value={flashcard!.id} />}
          {confirmDuplicate && <input type="hidden" name="confirmDuplicate" value="1" />}
          {removeImage && <input type="hidden" name="removeImage" value="1" />}
          {removeBackImage && <input type="hidden" name="removeBackImage" value="1" />}

          <div className="field-row">
            <div className="field">
              <label htmlFor="fc-subject">Disciplina</label>
              <select
                id="fc-subject"
                name="subjectId"
                required
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setTopicId("");
                }}
              >
                <option value="">Selecione</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fc-topic">Assunto</label>
              <select
                id="fc-topic"
                name="topicId"
                required
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={!subjectId}
              >
                <option value="">Selecione</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <RichTextEditor
            name="front"
            label="Frente do cartão"
            placeholder="Escreva a pergunta ou o estímulo que você quer lembrar"
            required
            defaultValue={flashcard?.front ?? ""}
          />

          <RichTextEditor
            name="back"
            label="Verso do cartão"
            placeholder="Escreva a resposta completa"
            required
            defaultValue={flashcard?.back ?? ""}
          />

          <div className="field">
            <label htmlFor="image">Imagem na frente (opcional)</label>
            <label className="fc-image-upload" htmlFor="image">
              {imagePreview ? (
                <img src={imagePreview} alt="" />
              ) : (
                <div>
                  <span style={{ fontSize: 22 }}>🖼️</span>
                  <span className="fc-image-upload-hint">
                    Clique para adicionar uma imagem, um ECG, uma radiografia
                  </span>
                </div>
              )}
            </label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleImageChange(e, "front")}
            />
            {imagePreview && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setImagePreview(null);
                  setRemoveImage(true);
                }}
              >
                Remover imagem
              </button>
            )}
          </div>

          <div className="field">
            <label htmlFor="backImage">Imagem no verso (opcional)</label>
            <label className="fc-image-upload" htmlFor="backImage">
              {backImagePreview ? (
                <img src={backImagePreview} alt="" />
              ) : (
                <div>
                  <span style={{ fontSize: 22 }}>🖼️</span>
                  <span className="fc-image-upload-hint">Clique para adicionar uma imagem à resposta</span>
                </div>
              )}
            </label>
            <input
              id="backImage"
              name="backImage"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleImageChange(e, "back")}
            />
            {backImagePreview && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setBackImagePreview(null);
                  setRemoveBackImage(true);
                }}
              >
                Remover imagem
              </button>
            )}
          </div>

          <div className="field">
            <label htmlFor="tags">Etiquetas (opcional)</label>
            <input
              id="tags"
              name="tags"
              type="text"
              placeholder="Ex: prova set, revisar"
              defaultValue={flashcard?.tags.join(", ") ?? ""}
            />
          </div>

          {state.error && <p className="error-text">{state.error}</p>}
          <SubmitButton pendingText="Salvando...">Guardar flashcard</SubmitButton>
        </form>
      </div>
    </div>
  );
}
