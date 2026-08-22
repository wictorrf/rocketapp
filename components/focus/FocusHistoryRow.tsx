"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteFocusSessionAction } from "@/lib/actions/focus";
import { formatHours } from "@/lib/utils/format";
import { MODE_LABEL } from "@/lib/timer/pomodoro";
import type { FocusHistoryEntry } from "@/lib/queries/focus";

function formatDateTime(iso: string) {
  const date = new Date(iso);
  const dateLabel = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const timeLabel = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} às ${timeLabel}`;
}

export function FocusHistoryRow({ entry }: { entry: FocusHistoryEntry }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    await deleteFocusSessionAction(entry.id);
    setPending(false);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div className="fc-row">
      <div className="fc-row-body">
        <b>
          {entry.subjectName}, {entry.topicName}
        </b>
        <span>
          {formatDateTime(entry.startedAt)} · {entry.activityLabel} · {MODE_LABEL[entry.mode]}
          {entry.simuladoResult &&
            ` · ${entry.simuladoResult.questionsCorrect}/${entry.simuladoResult.questionsDone} acertos`}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "right" }}>
          <b style={{ display: "block", fontSize: 13.5 }}>{formatHours(entry.netMinutes)}</b>
          {entry.mode !== "simulado" && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{entry.cyclesCompleted} ciclos</span>
          )}
        </div>
        <KebabMenu actions={[{ label: "Excluir sessão", danger: true, onClick: () => setDeleting(true) }]} />
      </div>

      {deleting && (
        <ConfirmDialog
          title="Excluir sessão"
          description="Essa sessão de estudo será removida do histórico e das suas métricas. Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          danger
          pending={pending}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
