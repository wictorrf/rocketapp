"use client";

import { useRouter } from "next/navigation";
import { resolveTaskColor, TASK_TYPE_LABEL } from "@/lib/constants/calendar";
import { EventActionsMenu } from "./EventActionsMenu";
import type { CalendarItem } from "@/lib/queries/calendar";

const STATUS_LABEL: Record<string, string> = { pending: "", done: "Concluído", cancelled: "Cancelado" };

export function EventRow({ item, onEdit }: { item: CalendarItem; onEdit: (item: CalendarItem) => void }) {
  const router = useRouter();
  const color = resolveTaskColor(item);
  const typeLabel = item.typeCustom || TASK_TYPE_LABEL[item.type] || item.type;

  function handleClick() {
    if (item.origin === "fsrs") {
      router.push(`/subjects/${item.subjectId}/topics/${item.topicId}/review`);
      return;
    }
    onEdit(item);
  }

  return (
    <div className={`day-detail-row${item.status === "cancelled" ? " cancelled" : ""}`}>
      <div className="dd-dot" style={{ background: color }} />
      <button type="button" className="dd-body dd-body-btn" onClick={handleClick}>
        <b style={item.status === "done" ? { textDecoration: "line-through" } : undefined}>
          {item.emoji ? `${item.emoji} ` : ""}
          {item.origin === "fsrs" ? `Revisão, ${item.title}` : item.title}
        </b>
        <div className="dd-meta">
          <span>{item.origin === "fsrs" ? `${item.cardCount} ${item.cardCount === 1 ? "cartão" : "cartões"}` : typeLabel}</span>
          {!item.allDay && item.startTime && (
            <span>
              🕐 {item.startTime.slice(0, 5)}
              {item.endTime ? `–${item.endTime.slice(0, 5)}` : ""}
            </span>
          )}
          {item.subjectName && <span>{item.subjectName}</span>}
          {item.location && <span>📍 {item.location}</span>}
          {STATUS_LABEL[item.status] && <span>{STATUS_LABEL[item.status]}</span>}
          {item.questionResult && (
            <span>
              {item.questionResult.questionsCorrect}/{item.questionResult.questionsDone} acertos
            </span>
          )}
        </div>
        {item.notes && <div className="dd-notes">{item.notes}</div>}
      </button>
      <EventActionsMenu event={item} onEdit={() => onEdit(item)} />
    </div>
  );
}
