"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EditScopeDialog } from "./EditScopeDialog";
import { deleteCalendarEventAction, setEventStatusAction, getSeriesOccurrenceCountsAction } from "@/lib/actions/calendar";
import type { CalendarItem } from "@/lib/queries/calendar";

export function DeleteEventDialog({ event, onClose }: { event: CalendarItem; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [counts, setCounts] = useState<{ future: number; total: number } | null>(null);

  useEffect(() => {
    if (event.recurrenceGroupId) {
      getSeriesOccurrenceCountsAction(event.recurrenceGroupId, event.scheduledDate).then(setCounts);
    }
  }, [event.recurrenceGroupId, event.scheduledDate]);

  async function runDelete(scope: "this" | "future" | "all") {
    setPending(true);
    await deleteCalendarEventAction(event.id, scope);
    setPending(false);
    router.refresh();
    onClose();
  }

  async function runCancel() {
    setPending(true);
    await setEventStatusAction(event.id, "cancelled");
    setPending(false);
    router.refresh();
    onClose();
  }

  if (event.recurrenceGroupId) {
    return <EditScopeDialog kind="delete" counts={counts} pending={pending} onChoose={runDelete} onCancel={onClose} />;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Excluir evento</h2>
        <p className="confirm-dialog-body">
          <b>{event.title}</b>, {new Date(`${event.scheduledDate}T00:00:00`).toLocaleDateString("pt-BR")}. Essa ação
          não pode ser desfeita.
        </p>
        <div className="confirm-dialog-actions" style={{ flexDirection: "column" }}>
          <button type="button" className="btn btn-ghost btn-block" disabled={pending} onClick={runCancel}>
            Cancelar evento (mantém no histórico)
          </button>
          <button type="button" className="btn btn-danger btn-block" disabled={pending} onClick={() => runDelete("this")}>
            Excluir evento
          </button>
          <button type="button" className="btn btn-primary btn-block" disabled={pending} onClick={onClose}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
