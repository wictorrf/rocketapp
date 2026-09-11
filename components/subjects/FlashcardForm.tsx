"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FlashcardFlipView } from "./FlashcardFlipView";
import { createFlashcardAction, updateFlashcardAction, deleteFlashcardAction, type FlashcardActionState } from "@/lib/actions/flashcards";
import type { FlashcardForEdit } from "@/lib/queries/flashcards";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

const initialState: FlashcardActionState = { error: null };

type Draft = {
  subjectId: string;
  topicId: string;
  front: string;
  back: string;
  tags: string;
};

function draftKey(flashcardId?: string) {
  return `rocket-flashcard-draft:${flashcardId ?? "new"}`;
}

function readDraft(flashcardId?: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(flashcardId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(flashcardId: string | undefined, draft: Draft) {
  try {
    localStorage.setItem(draftKey(flashcardId), JSON.stringify(draft));
  } catch {
    // localStorage indisponível (modo privado etc.) — rascunho vira no-op
  }
}

function clearDraft(flashcardId?: string) {
  try {
    localStorage.removeItem(draftKey(flashcardId));
  } catch {
    // idem
  }
}

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
  const subjectSelectRef = useRef<HTMLSelectElement>(null);
  const topicSelectRef = useRef<HTMLSelectElement>(null);
  const tagsInputRef = useRef<HTMLInputElement>(null);
  const imageAltInputRef = useRef<HTMLInputElement>(null);
  const backImageAltInputRef = useRef<HTMLInputElement>(null);
  const [keepOpenAfterSave, setKeepOpenAfterSave] = useState(false);

  const initialSubjectId = flashcard?.subjectId ?? defaultSubjectId ?? "";
  const initialTopicId = flashcard?.topicId ?? defaultTopicId ?? "";

  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [topicId, setTopicId] = useState(initialTopicId);
  const [frontHtml, setFrontHtml] = useState(flashcard?.front ?? "");
  const [backHtml, setBackHtml] = useState(flashcard?.back ?? "");
  const [tagsText, setTagsText] = useState(flashcard?.tags.join(", ") ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(flashcard?.imageUrl ?? null);
  const [imageAlt, setImageAlt] = useState(flashcard?.imageAlt ?? "");
  const [removeImage, setRemoveImage] = useState(false);
  const [backImagePreview, setBackImagePreview] = useState<string | null>(flashcard?.backImageUrl ?? null);
  const [backImageAlt, setBackImageAlt] = useState(flashcard?.backImageAlt ?? "");
  const [removeBackImage, setRemoveBackImage] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [draftBanner, setDraftBanner] = useState<Draft | null>(null);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");

  const topics = useMemo(() => subjects.find((s) => s.id === subjectId)?.topics ?? [], [subjects, subjectId]);
  const topicName = topics.find((t) => t.id === topicId)?.name ?? "";
  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";

  // Oferece restaurar um rascunho salvo (deste cartão, ou de "novo flashcard"
  // em modo criação) sempre que o painel abre — ajustado durante a
  // renderização (padrão recomendado pelo React) em vez de um efeito, pra
  // recalcular a cada reabertura do painel, não só uma vez.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraftBanner(readDraft(flashcard?.id));
  }

  function restoreDraft() {
    if (!draftBanner) return;
    setSubjectId(draftBanner.subjectId);
    setTopicId(draftBanner.topicId);
    setFrontHtml(draftBanner.front);
    setBackHtml(draftBanner.back);
    setTagsText(draftBanner.tags);
    setEditorResetKey((k) => k + 1);
    setDraftBanner(null);
  }

  function dismissDraftBanner() {
    clearDraft(flashcard?.id);
    setDraftBanner(null);
  }

  // Rascunho automático: salva o texto (sem imagens, que não cabem bem em
  // localStorage) alguns instantes depois de parar de digitar.
  useEffect(() => {
    if (!open) return;
    if (!frontHtml.trim() && !backHtml.trim() && !tagsText.trim()) return;
    const handle = setTimeout(() => {
      writeDraft(flashcard?.id, { subjectId, topicId, front: frontHtml, back: backHtml, tags: tagsText });
    }, 800);
    return () => clearTimeout(handle);
  }, [open, subjectId, topicId, frontHtml, backHtml, tagsText, flashcard?.id]);

  const isDirty =
    subjectId !== initialSubjectId ||
    topicId !== initialTopicId ||
    frontHtml !== (flashcard?.front ?? "") ||
    backHtml !== (flashcard?.back ?? "") ||
    tagsText !== (flashcard?.tags.join(", ") ?? "") ||
    imagePreview !== (flashcard?.imageUrl ?? null) ||
    backImagePreview !== (flashcard?.backImageUrl ?? null);

  function requestClose() {
    if (isDirty) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  }

  function confirmSaveDraftAndClose() {
    writeDraft(flashcard?.id, { subjectId, topicId, front: frontHtml, back: backHtml, tags: tagsText });
    setShowCloseConfirm(false);
    onClose();
  }

  function confirmDiscardAndClose() {
    clearDraft(flashcard?.id);
    // O painel fica montado entre aberturas (só `open` alterna) — descartar
    // precisa devolver os campos ao estado original, senão reabrir mostra o
    // mesmo conteúdo "descartado" de novo, só sem o rascunho salvo.
    setSubjectId(initialSubjectId);
    setTopicId(initialTopicId);
    setFrontHtml(flashcard?.front ?? "");
    setBackHtml(flashcard?.back ?? "");
    setTagsText(flashcard?.tags.join(", ") ?? "");
    setImagePreview(flashcard?.imageUrl ?? null);
    setImageAlt(flashcard?.imageAlt ?? "");
    setRemoveImage(false);
    setBackImagePreview(flashcard?.backImageUrl ?? null);
    setBackImageAlt(flashcard?.backImageAlt ?? "");
    setRemoveBackImage(false);
    setEditorResetKey((k) => k + 1);
    setShowCloseConfirm(false);
    onClose();
  }

  async function handleDelete() {
    if (!flashcard) return;
    setDeletePending(true);
    await deleteFlashcardAction(flashcard.id, subjectId, topicId);
    setDeletePending(false);
    clearDraft(flashcard.id);
    onClose();
  }

  // Sucesso de verdade: já foi submetido, terminou de processar, sem erro e
  // sem aviso de duplicidade pendente (que também chega como error: null,
  // mas ainda precisa de uma decisão da pessoa antes de salvar).
  /* eslint-disable react-hooks/set-state-in-effect -- reação a um evento
     assíncrono externo (a Server Action terminando), não estado derivado de
     prop; "Guardar e criar outro" precisa resetar vários campos de uma vez
     nesse instante específico. */
  useEffect(() => {
    if (hasSubmitted.current && !isPending && state.error === null && !state.duplicate) {
      hasSubmitted.current = false;
      clearDraft(flashcard?.id);
      router.refresh();
      if (keepOpenAfterSave && !isEdit) {
        setKeepOpenAfterSave(false);
        setFrontHtml("");
        setBackHtml("");
        setTagsText("");
        setImagePreview(null);
        setImageAlt("");
        setRemoveImage(false);
        setBackImagePreview(null);
        setBackImageAlt("");
        setRemoveBackImage(false);
        setEditorResetKey((k) => k + 1);
      } else {
        // Painel de criação fica montado entre aberturas — sem isso, reabrir
        // "Novo flashcard" depois de um "Guardar flashcard" comum ainda
        // mostraria o cartão recém-salvo nos campos (mesma causa do bug do
        // "Descartar alterações").
        if (!isEdit) {
          setSubjectId(initialSubjectId);
          setTopicId(initialTopicId);
          setFrontHtml("");
          setBackHtml("");
          setTagsText("");
          setImagePreview(null);
          setImageAlt("");
          setRemoveImage(false);
          setBackImagePreview(null);
          setBackImageAlt("");
          setRemoveBackImage(false);
          setEditorResetKey((k) => k + 1);
        }
        onClose();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isPending]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // O <form action> do React reseta os elementos nativos do formulário
  // (form.reset()) toda vez que a Server Action termina — inclusive quando o
  // resultado é o aviso de duplicidade, não só em sucesso. Isso zera o valor
  // exibido por <select>/<input> no DOM mesmo quando o estado em React (usado
  // no próximo envio) continua correto, deixando os campos com aparência de
  // vazios por engano. Reforça a sincronia depois de cada resposta da action.
  useEffect(() => {
    if (subjectSelectRef.current) subjectSelectRef.current.value = subjectId;
    if (topicSelectRef.current) topicSelectRef.current.value = topicId;
    if (tagsInputRef.current) tagsInputRef.current.value = tagsText;
    if (imageAltInputRef.current) imageAltInputRef.current.value = imageAlt;
    if (backImageAltInputRef.current) backImageAltInputRef.current.value = backImageAlt;
  }, [state, subjectId, topicId, tagsText, imageAlt, backImageAlt]);

  function handleImageFile(file: File, side: "front" | "back") {
    if (!file.type.startsWith("image/")) return;
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

  function handleImageInputChange(e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file, side);
  }

  function handleDrop(e: React.DragEvent<HTMLElement>, side: "front" | "back") {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file, side);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLElement>, side: "front" | "back") {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      handleImageFile(file, side);
    }
  }

  if (!open) return null;

  const canSubmit = !isPending;

  return (
    <div className="subjects-page fc-editor-page">
      <div className="fc-editor-header">
        <div>
          <h2 className="section-title" style={{ marginBottom: 2 }}>
            {isEdit ? "Editar flashcard" : "Novo flashcard"}
          </h2>
          {(subjectName || topicName) && (
            <p className="muted-note">
              {subjectName}
              {subjectName && topicName ? " › " : ""}
              {topicName}
            </p>
          )}
        </div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="Fechar">
          ✕
        </button>
      </div>

      <div className="fc-editor-mobile-tabs">
        <button type="button" className={mobileTab === "editor" ? "active" : ""} onClick={() => setMobileTab("editor")}>
          Editar
        </button>
        <button type="button" className={mobileTab === "preview" ? "active" : ""} onClick={() => setMobileTab("preview")}>
          Visualizar
        </button>
      </div>

      {draftBanner && (
        <div className="draft-banner">
          <span>Você tem um rascunho salvo.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={restoreDraft}>
            Restaurar
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={dismissDraftBanner}>
            Descartar
          </button>
        </div>
      )}

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

      <div className="fc-editor-grid" data-mobile-tab={mobileTab}>
        <div className="fc-editor-col-left">
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
                  ref={subjectSelectRef}
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
                  ref={topicSelectRef}
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
              key={`front-${editorResetKey}`}
              name="front"
              label="Frente do cartão"
              placeholder="Escreva a pergunta ou o estímulo que você quer lembrar"
              required
              defaultValue={frontHtml}
              onChange={setFrontHtml}
            />

            <RichTextEditor
              key={`back-${editorResetKey}`}
              name="back"
              label="Verso do cartão"
              placeholder="Escreva a resposta completa"
              required
              defaultValue={backHtml}
              onChange={setBackHtml}
            />

            <div className="field">
              <label>Imagens (opcional)</label>
              <div className="fc-image-slots">
                <div className="fc-image-slot">
                  {imagePreview ? (
                    <div className="fc-image-chip">
                      <img src={imagePreview} alt="" />
                      <div className="fc-image-chip-body">
                        <span className="fc-image-chip-label">Frente</span>
                        <input
                          ref={imageAltInputRef}
                          type="text"
                          name="imageAlt"
                          placeholder="Texto alternativo"
                          value={imageAlt}
                          onChange={(e) => setImageAlt(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="fc-image-chip-remove"
                        aria-label="Remover imagem da frente"
                        onClick={() => {
                          setImagePreview(null);
                          setImageAlt("");
                          setRemoveImage(true);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label
                      className="fc-image-add-btn"
                      htmlFor="image"
                      tabIndex={0}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, "front")}
                      onPaste={(e) => handlePaste(e, "front")}
                    >
                      🖼️ Imagem na frente
                    </label>
                  )}
                  <input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageInputChange(e, "front")}
                  />
                </div>

                <div className="fc-image-slot">
                  {backImagePreview ? (
                    <div className="fc-image-chip">
                      <img src={backImagePreview} alt="" />
                      <div className="fc-image-chip-body">
                        <span className="fc-image-chip-label">Verso</span>
                        <input
                          ref={backImageAltInputRef}
                          type="text"
                          name="backImageAlt"
                          placeholder="Texto alternativo"
                          value={backImageAlt}
                          onChange={(e) => setBackImageAlt(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="fc-image-chip-remove"
                        aria-label="Remover imagem do verso"
                        onClick={() => {
                          setBackImagePreview(null);
                          setBackImageAlt("");
                          setRemoveBackImage(true);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label
                      className="fc-image-add-btn"
                      htmlFor="backImage"
                      tabIndex={0}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, "back")}
                      onPaste={(e) => handlePaste(e, "back")}
                    >
                      🖼️ Imagem no verso
                    </label>
                  )}
                  <input
                    id="backImage"
                    name="backImage"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageInputChange(e, "back")}
                  />
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="tags">Etiquetas (opcional)</label>
              <input
                ref={tagsInputRef}
                id="tags"
                name="tags"
                type="text"
                placeholder="Ex: prova set, revisar"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
              />
            </div>

            {state.error && <p className="error-text">{state.error}</p>}

            <div className="fc-form-actions">
              {isEdit && (
                <button type="button" className="btn btn-danger" disabled={!canSubmit} onClick={() => setShowDeleteConfirm(true)}>
                  Excluir flashcard
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={requestClose}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSubmit}
                onClick={() => setKeepOpenAfterSave(false)}
              >
                {isPending && !keepOpenAfterSave ? "Salvando..." : isEdit ? "Salvar alterações" : "Salvar flashcard"}
              </button>
              {!isEdit && (
                <button
                  type="submit"
                  className="btn btn-ghost"
                  disabled={!canSubmit}
                  onClick={() => setKeepOpenAfterSave(true)}
                >
                  {isPending && keepOpenAfterSave ? "Salvando..." : "Salvar e criar outro"}
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="fc-editor-col-right">
          <div className="fc-editor-preview-label">Pré-visualização</div>
          <FlashcardFlipView
            front={frontHtml}
            back={backHtml}
            imageUrl={imagePreview}
            imageAlt={imageAlt}
            backImageUrl={backImagePreview}
            backImageAlt={backImageAlt}
          />
          <p className="muted-note" style={{ textAlign: "center", marginTop: 14 }}>
            É assim que o cartão vai aparecer numa sessão de revisão.
          </p>
        </div>
      </div>

      {showCloseConfirm && (
        <div className="modal-overlay" onClick={() => setShowCloseConfirm(false)}>
          <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Alterações não salvas</h2>
            <p className="confirm-dialog-body">Você tem alterações neste flashcard que ainda não foram guardadas.</p>
            <div className="confirm-dialog-actions" style={{ flexWrap: "wrap" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCloseConfirm(false)}>
                Continuar editando
              </button>
              <button type="button" className="btn btn-ghost" onClick={confirmDiscardAndClose}>
                Descartar alterações
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmSaveDraftAndClose}>
                Guardar rascunho
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Excluir flashcard"
          description={<p>Este flashcard será retirado das filas de revisão. Essa ação não pode ser desfeita.</p>}
          confirmLabel="Excluir flashcard"
          danger
          pending={deletePending}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
