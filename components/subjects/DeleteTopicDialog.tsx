"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteTopicAction,
  getTopicDeletionImpactAction,
  listOtherActiveTopicsAction,
} from "@/lib/actions/topics";

type Impact = Awaited<ReturnType<typeof getTopicDeletionImpactAction>>;
type MoveTarget = { id: string; name: string; subjectName: string };

export function DeleteTopicDialog({
  topicId,
  topicName,
  subjectId,
  onClose,
  onDeleted,
}: {
  topicId: string;
  topicName: string;
  subjectId: string;
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
    getTopicDeletionImpactAction(topicId).then(setImpact);
    listOtherActiveTopicsAction(topicId).then(setTargets);
  }, [topicId]);

  async function runDelete(deleteMode: "archive" | "move" | "delete") {
    setPending(true);
    setError(null);
    const result = await deleteTopicAction(
      topicId,
      subjectId,
      deleteMode,
      deleteMode === "move" ? targetId : undefined,
    );
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
          <h2>Mover conteúdos de {topicName}</h2>
          <div className="confirm-dialog-body">
            <p style={{ marginBottom: 10 }}>
              {impact.flashcardCount} flashcards e {impact.questionLogCount} registros de questões serão movidos
              pra outro assunto. Escolha o assunto de destino:
            </p>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Selecione...</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.subjectName} › {t.name}
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
              {pending ? "Movendo..." : "Mover e excluir assunto"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "delete") {
    return (
      <ConfirmDialog
        title={`Excluir "${topicName}" e seus conteúdos`}
        description={
          <>
            Isso vai excluir permanentemente <b>{impact.flashcardCount} flashcards</b> e{" "}
            <b>{impact.questionLogCount} registros de questões</b>.
            {impact.calendarEventCount > 0 && (
              <>
                {" "}
                {impact.calendarEventCount} evento(s) no Calendário vinculados ficarão sem assunto.
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
        confirmLabel="Excluir assunto e seus conteúdos"
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
        <h2>Excluir {topicName}</h2>
        <div className="confirm-dialog-body">
          <p>
            Esse assunto tem {impact.flashcardCount} flashcards e {impact.questionLogCount} registros de
            questões.
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
            Excluir assunto e conteúdos
          </button>
        </div>
      </div>
    </div>
  );
}
