"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { createFlashcardAction, type ActionState } from "@/lib/actions/flashcards";

const initialState: ActionState = { error: null };

export function NewFlashcardForm({
  subjectId,
  topicId,
  topicName,
}: {
  subjectId: string;
  topicId: string;
  topicName: string;
}) {
  const [state, formAction] = useActionState(createFlashcardAction, initialState);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="fc-form-wrap">
      <div className="fc-form-box">
        <div className="fc-form-top">
          <Link
            href={`/subjects/${subjectId}/topics/${topicId}`}
            className="icon-btn"
            aria-label="Voltar"
          >
            ‹
          </Link>
          <div>
            <div className="step">Novo flashcard</div>
            <h2>{topicName}</h2>
          </div>
        </div>

        <form action={formAction}>
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="topicId" value={topicId} />

          <RichTextEditor
            name="front"
            label="Frente do cartão"
            placeholder="Escreva a pergunta ou o estímulo que você quer lembrar"
            required
          />

          <RichTextEditor
            name="back"
            label="Verso do cartão"
            placeholder="Escreva a resposta completa"
            required
          />

          <div className="field">
            <label htmlFor="image">Imagem (opcional)</label>
            <label className="fc-image-upload" htmlFor="image">
              {imagePreview ? (
                <img src={imagePreview} alt="" />
              ) : (
                <div>
                  <span style={{ fontSize: 22 }}>🖼️</span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12.5,
                      marginTop: 6,
                      color: "var(--text-muted)",
                      fontWeight: 700,
                    }}
                  >
                    Clique para adicionar uma imagem, um ECG, uma radiografia, o que ajudar
                    você a lembrar
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
              onChange={handleImageChange}
            />
          </div>

          {state.error && <p className="error-text">{state.error}</p>}
          <SubmitButton pendingText="Salvando...">Salvar flashcard</SubmitButton>
        </form>
      </div>
    </div>
  );
}
