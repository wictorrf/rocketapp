"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteSubjectAction,
  getSubjectDeletionImpactAction,
  listActiveSubjectsForMoveAction,
} from "@/lib/actions/subjects";

type Impact = Awaited<ReturnType<typeof getSubjectDeletionImpactAction>>;
type MoveTarget = { id: string; name: string; icon: string | null };

export function DeleteSubjectDialog({
  subjectId,
  subjectName,
  onClose,
  onDeleted,
}: {
  subjectId: string;
  subjectName: string;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [targets, setTargets] = useState<MoveTarget[]>([]);
  const [mode, setMode] = useState<"choose" | "move" | "delete">("choose");
  const [targetId, setTargetId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSubjectDeletionImpactAction(subjectId).then(setImpact);
    listActiveSubjectsForMoveAction(subjectId).then(setTargets);
  }, [subjectId]);

  async function runDelete(deleteMode: "archive" | "move" | "delete") {
    setPending(true);
    setError(null);
    const result = await deleteSubjectAction(subjectId, deleteMode, deleteMode === "move" ? targetId : undefined);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (onDeleted) onDeleted();
    else router.refresh();
    onClose();
  }

  if (!impact) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
          <p>Calculando o que será afetado...</p>
        </div>
      </div>
    );
  }

  if (mode === "move") {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
          <h2>Mover conteúdos de {subjectName}</h2>
          <div className="confirm-dialog-body">
            <p style={{ marginBottom: 10 }}>
              {impact.topicCount} {impact.topicCount === 1 ? "assunto" : "assuntos"} e {impact.flashcardCount}{" "}
              {impact.flashcardCount === 1 ? "flashcard" : "flashcards"} serão movidos. Escolha a disciplina de
              destino:
            </p>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Selecione...</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setMode("choose")} disabled={pending}>
              Voltar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending || !targetId}
              onClick={() => runDelete("move")}
            >
              {pending ? "Movendo..." : "Mover e excluir disciplina"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "delete") {
    return (
      <ConfirmDialog
        title={`Excluir "${subjectName}" e seus conteúdos`}
        description={
          <>
            Isso vai excluir permanentemente{" "}
            <b>
              {impact.topicCount} {impact.topicCount === 1 ? "assunto" : "assuntos"}
            </b>
            , <b>{impact.flashcardCount} flashcards</b> e{" "}
            <b>{impact.questionLogCount} registros de questões</b>.
            {impact.calendarEventCount > 0 && (
              <>
                {" "}
                {impact.calendarEventCount} evento(s) no Calendário vinculados a essa disciplina ficarão sem
                disciplina.
              </>
            )}
            {error && (
              <>
                <br />
                <span className="error-text">{error}</span>
              </>
            )}
          </>
        }
        confirmLabel="Excluir disciplina e seus conteúdos"
        danger
        pending={pending}
        onConfirm={() => runDelete("delete")}
        onCancel={() => setMode("choose")}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Excluir {subjectName}</h2>
        <div className="confirm-dialog-body">
          <p>
            Essa disciplina tem {impact.topicCount} {impact.topicCount === 1 ? "assunto" : "assuntos"},{" "}
            {impact.flashcardCount} flashcards e {impact.questionLogCount} registros de questões.
          </p>
        </div>
        <div className="confirm-dialog-actions" style={{ flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => runDelete("archive")}>
            Arquivar em vez de excluir
          </button>
          {targets.length > 0 && (
            <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => setMode("move")}>
              Mover conteúdos
            </button>
          )}
          <button type="button" className="btn btn-danger" disabled={pending} onClick={() => setMode("delete")}>
            Excluir disciplina e conteúdos
          </button>
        </div>
      </div>
    </div>
  );
}
