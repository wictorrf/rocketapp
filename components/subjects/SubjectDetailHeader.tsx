"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { SubjectFormPanel } from "./SubjectFormPanel";
import { DeleteSubjectDialog } from "./DeleteSubjectDialog";
import { archiveSubjectAction, restoreSubjectAction } from "@/lib/actions/subjects";
import { getContrastText } from "@/lib/constants/entity-colors";
import type { SubjectRecord } from "@/lib/queries/subjects";

export function SubjectDetailHeader({ subject }: { subject: SubjectRecord }) {
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

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <Link href="/subjects" className="icon-btn" aria-label="Voltar">
        ‹
      </Link>
      <div
        className="subject-icon"
        style={{ background: color, color: getContrastText(color), width: 40, height: 40, fontSize: 16 }}
      >
        {subject.icon ?? "📚"}
      </div>
      <h2 className="section-title" style={{ margin: 0, flex: 1 }}>
        {subject.name} {isArchived && <span className="status-badge">Arquivada</span>}
      </h2>

      <KebabMenu
        ariaLabel={`Mais opções de ${subject.name}`}
        actions={[
          { label: "Editar disciplina", onClick: () => setEditing(true) },
          { label: isArchived ? "Restaurar disciplina" : "Arquivar disciplina", onClick: handleArchiveToggle },
          { label: "Excluir disciplina", onClick: () => setDeleting(true), danger: true },
        ]}
      />

      <SubjectFormPanel mode="edit" subject={subject} open={editing} onClose={() => setEditing(false)} />
      {deleting && (
        <DeleteSubjectDialog
          subjectId={subject.id}
          subjectName={subject.name}
          onClose={() => setDeleting(false)}
          onDeleted={() => router.push("/subjects")}
        />
      )}
    </div>
  );
}
