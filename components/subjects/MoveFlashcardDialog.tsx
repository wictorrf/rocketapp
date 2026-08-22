"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { moveFlashcardAction, listActiveTopicsForFlashcardMoveAction } from "@/lib/actions/flashcards";

type TopicTarget = { id: string; label: string };

export function MoveFlashcardDialog({
  flashcardId,
  subjectId,
  topicId,
  onClose,
}: {
  flashcardId: string;
  subjectId: string;
  topicId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicTarget[] | null>(null);
  const [targetTopicId, setTargetTopicId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listActiveTopicsForFlashcardMoveAction(topicId).then(setTopics);
  }, [topicId]);

  async function handleConfirm() {
    if (!targetTopicId) return;
    setPending(true);
    setError(null);
    const result = await moveFlashcardAction(flashcardId, subjectId, topicId, targetTopicId);
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
      <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Mover flashcard</h2>
        <div className="confirm-dialog-body">
          {topics === null ? (
            <p>Carregando assuntos...</p>
          ) : topics.length === 0 ? (
            <p>Você não tem outro assunto ativo pra mover esse flashcard.</p>
          ) : (
            <>
              <label htmlFor="move-flashcard-target" style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>
                Assunto de destino
              </label>
              <select
                id="move-flashcard-target"
                value={targetTopicId}
                onChange={(e) => setTargetTopicId(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">Selecione...</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending || !targetTopicId}
            onClick={handleConfirm}
          >
            {pending ? "Movendo..." : "Mover flashcard"}
          </button>
        </div>
      </div>
    </div>
  );
}
