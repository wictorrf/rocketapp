"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { SubjectFormPanel } from "./SubjectFormPanel";
import { DeleteSubjectDialog } from "./DeleteSubjectDialog";
import { archiveSubjectAction, restoreSubjectAction, duplicateSubjectAction } from "@/lib/actions/subjects";
import { getContrastText } from "@/lib/constants/entity-colors";
import { formatRelativeDays, formatHours } from "@/lib/utils/format";
import type { SubjectSummary } from "@/lib/queries/subjects";

export function SubjectCard({ subject }: { subject: SubjectSummary }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isArchived = Boolean(subject.archivedAt);
  const color = subject.color ?? "#68162E";

  async function handleArchiveToggle() {
    if (isArchived) await restoreSubjectAction(subject.id);
    else await archiveSubjectAction(subject.id);
    router.refresh();
  }

  async function handleDuplicate() {
    await duplicateSubjectAction(subject.id, true);
    router.refresh();
  }

  return (
    <div className="subject-row">
      <Link href={`/subjects/${subject.id}/topics`} className="subject-row-link">
        <div className="subject-icon" style={{ background: color, color: getContrastText(color) }}>
          {subject.icon ?? "📚"}
        </div>
        <div className="subject-info">
          <b>
            {subject.name} {isArchived && <span className="status-badge">Arquivada</span>}
          </b>
          <span>
            {subject.topicCount} {subject.topicCount === 1 ? "assunto" : "assuntos"} · {subject.totalFlashcards}{" "}
            flashcards · última atividade {formatRelativeDays(subject.lastActivityAt)}
          </span>
        </div>
        <div className="subject-stats">
          {subject.pendingReviewsCount > 0 && (
            <div>
              <b style={{ color: "var(--amber)" }}>{subject.pendingReviewsCount}</b>
              <span>PENDENTES</span>
            </div>
          )}
          <div>
            <b>{subject.questionsAccuracyPct !== null ? `${subject.questionsAccuracyPct}%` : "—"}</b>
            <span>ACERTOS</span>
          </div>
          <div>
            <b>{formatHours(subject.studiedMinutes)}</b>
            <span>ESTUDADAS</span>
          </div>
        </div>
      </Link>

      <KebabMenu
        ariaLabel={`Mais opções de ${subject.name}`}
        actions={[
          { label: "Editar", onClick: () => setEditing(true) },
          { label: "Duplicar", onClick: handleDuplicate },
          { label: isArchived ? "Restaurar" : "Arquivar", onClick: handleArchiveToggle },
          { label: "Excluir", onClick: () => setDeleting(true), danger: true },
        ]}
      />

      <SubjectFormPanel mode="edit" subject={subject} open={editing} onClose={() => setEditing(false)} />
      {deleting && (
        <DeleteSubjectDialog subjectId={subject.id} subjectName={subject.name} onClose={() => setDeleting(false)} />
      )}
    </div>
  );
}
