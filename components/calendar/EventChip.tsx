"use client";

import { resolveTaskColor } from "@/lib/constants/calendar";
import type { CalendarItem } from "@/lib/queries/calendar";

export function EventChip({ item, onClick }: { item: CalendarItem; onClick: (e: React.MouseEvent) => void }) {
  const bg = resolveTaskColor(item);
  const label = item.origin === "fsrs" ? `Revisão · ${item.cardCount} ${item.cardCount === 1 ? "cartão" : "cartões"}` : item.title;
  return (
    <button
      type="button"
      className={`cal-tag${item.status === "cancelled" ? " cancelled" : ""}${item.status === "done" ? " done" : ""}`}
      style={{ background: bg }}
      onClick={onClick}
    >
      {item.emoji ? `${item.emoji} ` : ""}
      {label}
    </button>
  );
}
