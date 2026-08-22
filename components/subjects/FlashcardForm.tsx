"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { createFlashcardAction, updateFlashcardAction, type FlashcardActionState } from "@/lib/actions/flashcards";

const initialState: FlashcardActionState = { error: null };

export type FlashcardEditData = {
  id: string;
  front: string;
  back: string;
  tags: string[];
  imageUrl: string | null;
  backImageUrl: string | null;
};

export function FlashcardForm({
  subjectId,
  topicId,
  topicName,
  flashcard,
}: {
  subjectId: string;
  topicId: string;
  topicName: string;
  flashcard?: FlashcardEditData;
}) {
  const isEdit = Boolean(flashcard);
  const [state, formAction] = useActionState(isEdit ? updateFlashcardAction : createFlashcardAction, initialState);
  const [imagePreview, setImagePreview] = useState<string | null>(flashcard?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [backImagePreview, setBackImagePreview] = useState<string | null>(flashcard?.backImageUrl ?? null);
  const [removeBackImage, setRemoveBackImage] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

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

  return (
    <div className="fc-form-wrap">
      <div className="fc-form-box">
        <div className="fc-form-top">
          <Link href={`/subjects/${subjectId}/topics/${topicId}`} className="icon-btn" aria-label="Voltar">
            ‹
          </Link>
          <div>
            <div className="step">{isEdit ? "Editar flashcard" : "Novo flashcard"}</div>
            <h2>{topicName}</h2>
          </div>
        </div>

        {state.duplicate && !confirmDuplicate && (
          <div className="duplicate-warning">
            <p>
              Já existe um cartão parecido nesse assunto: <b>“{state.duplicate.frontPreview}”</b>
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <Link
                href={`/subjects/${subjectId}/topics/${topicId}/flashcards/${state.duplicate.id}/edit`}
                className="btn btn-ghost btn-sm"
              >
                Ver cartão existente
              </Link>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirmDuplicate(true)}>
                Continuar criação
              </button>
            </div>
          </div>
        )}

        <form action={formAction}>
          {isEdit && <input type="hidden" name="flashcardId" value={flashcard!.id} />}
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="topicId" value={topicId} />
          {confirmDuplicate && <input type="hidden" name="confirmDuplicate" value="1" />}
          {removeImage && <input type="hidden" name="removeImage" value="1" />}
          {removeBackImage && <input type="hidden" name="removeBackImage" value="1" />}

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
