"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MoveFlashcardDialog } from "./MoveFlashcardDialog";
import {
  duplicateFlashcardAction,
  suspendFlashcardAction,
  reactivateFlashcardAction,
  resetFlashcardProgressAction,
  deleteFlashcardAction,
} from "@/lib/actions/flashcards";
import { STAGE_LABEL_PT } from "@/lib/srs/fsrs";
import { htmlToPlainText } from "@/lib/utils/sanitize-html";
import { formatDueIn, isOverdue } from "@/lib/utils/format";
import type { FlashcardWithState } from "@/lib/queries/topics";

export function FlashcardRow({
  subjectId,
  topicId,
  card,
}: {
  subjectId: string;
  topicId: string;
  card: FlashcardWithState;
}) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);

  const overdue = !card.suspended && isOverdue(card.dueAt);
  const frontPreview = htmlToPlainText(card.front) || "(sem conteúdo)";
  const editHref = `/subjects/${subjectId}/topics/${topicId}/flashcards/${card.id}/edit`;

  async function handleDuplicate() {
    setPending(true);
    await duplicateFlashcardAction(card.id, subjectId, topicId);
    setPending(false);
    router.refresh();
  }

  async function handleSuspendToggle() {
    setPending(true);
    if (card.suspended) await reactivateFlashcardAction(card.id, subjectId, topicId);
    else await suspendFlashcardAction(card.id, subjectId, topicId);
    setPending(false);
    router.refresh();
  }

  async function handleReset() {
    setPending(true);
    await resetFlashcardProgressAction(card.id, subjectId, topicId);
    setPending(false);
    setResetting(false);
    router.refresh();
  }

  async function handleDelete() {
    setPending(true);
    await deleteFlashcardAction(card.id, subjectId, topicId);
    setPending(false);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div className={`fc-row ${overdue ? "overdue" : ""} ${card.suspended ? "suspended" : ""}`}>
      <Link href={editHref} className="fc-row-link">
        <div className="fc-thumb">{card.imageUrl ? <img src={card.imageUrl} alt="" /> : "🗂️"}</div>
        <div className="fc-row-body">
          <b>{frontPreview}</b>
          <span>
            {card.suspended
              ? "Suspenso"
              : overdue
                ? "Revisão atrasada"
                : `Próxima revisão ${formatDueIn(card.dueAt)}`}
            {card.tags.length > 0 && ` · ${card.tags.join(", ")}`}
          </span>
        </div>
      </Link>
      <div className={`fc-stage ${card.stage}`}>
        {!card.suspended && card.needsReinforcement ? "Precisa de reforço" : STAGE_LABEL_PT[card.stage]}
      </div>

      <KebabMenu
        ariaLabel="Mais opções do flashcard"
        actions={[
          { label: "Editar", onClick: () => router.push(editHref) },
          { label: "Mover", onClick: () => setMoving(true) },
          { label: "Duplicar", onClick: handleDuplicate },
          { label: card.suspended ? "Reativar" : "Suspender", onClick: handleSuspendToggle },
          { label: "Reiniciar progresso", onClick: () => setResetting(true) },
          { label: "Excluir", onClick: () => setDeleting(true), danger: true },
        ]}
      />

      {moving && (
        <MoveFlashcardDialog flashcardId={card.id} subjectId={subjectId} topicId={topicId} onClose={() => setMoving(false)} />
      )}

      {resetting && (
        <ConfirmDialog
          title="Reiniciar progresso"
          description={
            <p>
              <b>{frontPreview}</b> vai voltar ao estado Novo e receber um agendamento novo. O
              histórico de revisões anteriores não é apagado.
            </p>
          }
          confirmLabel="Reiniciar progresso"
          pending={pending}
          onConfirm={handleReset}
          onCancel={() => setResetting(false)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir flashcard"
          description={
            <p>
              <b>{frontPreview}</b> será retirado das filas de revisão. Prefere manter o histórico?
              Use Suspender em vez de excluir.
            </p>
          }
          confirmLabel="Excluir flashcard"
          danger
          pending={pending}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
