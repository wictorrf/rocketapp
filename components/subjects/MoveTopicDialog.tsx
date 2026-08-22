"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { moveTopicAction, checkTopicNameInSubjectAction } from "@/lib/actions/topics";
import { listActiveSubjectsForMoveAction } from "@/lib/actions/subjects";

type SubjectTarget = { id: string; name: string; icon: string | null };

export function MoveTopicDialog({
  topicId,
  topicName,
  currentSubjectId,
  onClose,
}: {
  topicId: string;
  topicName: string;
  currentSubjectId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<SubjectTarget[] | null>(null);
  const [targetSubjectId, setTargetSubjectId] = useState("");
  const [collision, setCollision] = useState<{ id: string; name: string } | null>(null);
  const [resolution, setResolution] = useState<"separate" | "rename">("separate");
  const [renameValue, setRenameValue] = useState(topicName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listActiveSubjectsForMoveAction(currentSubjectId).then(setSubjects);
  }, [currentSubjectId]);

  async function handleTargetChange(id: string) {
    setTargetSubjectId(id);
    setCollision(null);
    setResolution("separate");
    if (!id) return;
    const found = await checkTopicNameInSubjectAction(id, topicName);
    setCollision(found);
  }

  async function handleConfirm() {
    if (!targetSubjectId) return;
    setPending(true);
    setError(null);
    const result = await moveTopicAction(
      topicId,
      targetSubjectId,
      collision && resolution === "rename" ? renameValue : undefined,
    );
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
        <h2>Mover {topicName}</h2>
        <div className="confirm-dialog-body">
          {subjects === null ? (
            <p>Carregando disciplinas...</p>
          ) : subjects.length === 0 ? (
            <p>Você não tem outra disciplina ativa pra mover esse assunto.</p>
          ) : (
            <>
              <label htmlFor="move-target" style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>
                Disciplina de destino
              </label>
              <select
                id="move-target"
                value={targetSubjectId}
                onChange={(e) => handleTargetChange(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">Selecione...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>

              {collision && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ marginBottom: 8 }}>
                    Já existe um assunto chamado <b>{collision.name}</b> nessa disciplina.
                  </p>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <input
                      type="radio"
                      name="collision-resolution"
                      checked={resolution === "separate"}
                      onChange={() => setResolution("separate")}
                    />
                    Manter separado (os dois continuam existindo)
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="radio"
                      name="collision-resolution"
                      checked={resolution === "rename"}
                      onChange={() => setResolution("rename")}
                    />
                    Renomear ao mover
                  </label>
                  {resolution === "rename" && (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      style={{ width: "100%", marginTop: 8 }}
                    />
                  )}
                </div>
              )}
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
            disabled={pending || !targetSubjectId}
            onClick={handleConfirm}
          >
            {pending ? "Movendo..." : "Mover assunto"}
          </button>
        </div>
      </div>
    </div>
  );
}
