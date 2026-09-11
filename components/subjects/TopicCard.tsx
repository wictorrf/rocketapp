"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { TopicFormPanel } from "./TopicFormPanel";
import { MoveTopicDialog } from "./MoveTopicDialog";
import { DeleteTopicDialog } from "./DeleteTopicDialog";
import { archiveTopicAction, restoreTopicAction, duplicateTopicAction } from "@/lib/actions/topics";
import { getContrastText } from "@/lib/constants/entity-colors";
import { formatRelativeDays, formatHours } from "@/lib/utils/format";
import type { TopicSummary } from "@/lib/queries/topics";

export function TopicCard({
  subjectId,
  topic,
  dragHandle,
}: {
  subjectId: string;
  topic: TopicSummary;
  dragHandle?: React.ReactNode;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isArchived = Boolean(topic.archivedAt);
  const color = topic.color ?? "#98A2B3";

  async function handleArchiveToggle() {
    if (isArchived) await restoreTopicAction(topic.id, subjectId);
    else await archiveTopicAction(topic.id, subjectId);
    router.refresh();
  }

  async function handleDuplicate() {
    await duplicateTopicAction(topic.id, subjectId, true);
    router.refresh();
  }

  return (
    <div className="subject-row">
      {dragHandle}
      <Link href={`/subjects/${subjectId}/topics/${topic.id}`} className="subject-row-link">
        <div className="subject-icon" style={{ background: color, color: getContrastText(color) }}>
          {topic.emoji ?? "📖"}
        </div>
        <div className="subject-info">
          <b>
            {topic.name} {isArchived && <span className="status-badge">Arquivado</span>}
          </b>
          <span>
            {topic.totalFlashcards} {topic.totalFlashcards === 1 ? "flashcard" : "flashcards"} · última
            atividade {formatRelativeDays(topic.lastActivityAt)}
            {topic.tags.length > 0 && ` · ${topic.tags.join(", ")}`}
          </span>
        </div>
        <div className="subject-stats">
          {topic.pendingReviewsCount > 0 && (
            <div>
              <b style={{ color: "var(--amber)" }}>{topic.pendingReviewsCount}</b>
              <span>PENDENTES</span>
            </div>
          )}
          <div>
            <b>{topic.questionsAccuracyPct !== null ? `${topic.questionsAccuracyPct}%` : "—"}</b>
            <span>ACERTOS</span>
          </div>
          <div>
            <b>{formatHours(topic.studiedMinutes)}</b>
            <span>ESTUDADAS</span>
          </div>
        </div>
      </Link>

      <KebabMenu
        ariaLabel={`Mais opções de ${topic.name}`}
        actions={[
          { label: "Editar", onClick: () => setEditing(true) },
          { label: "Mover", onClick: () => setMoving(true) },
          { label: "Duplicar", onClick: handleDuplicate },
          { label: isArchived ? "Restaurar" : "Arquivar", onClick: handleArchiveToggle },
          { label: "Excluir", onClick: () => setDeleting(true), danger: true },
        ]}
      />

      <TopicFormPanel mode="edit" subjectId={subjectId} topic={topic} open={editing} onClose={() => setEditing(false)} />
      {moving && (
        <MoveTopicDialog
          topicId={topic.id}
          topicName={topic.name}
          currentSubjectId={subjectId}
          onClose={() => setMoving(false)}
        />
      )}
      {deleting && (
        <DeleteTopicDialog
          topicId={topic.id}
          topicName={topic.name}
          subjectId={subjectId}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
