"use client";

import Link from "next/link";
import { EventChip } from "./EventChip";
import { WEEKDAY_LABEL_MON_FIRST_PT } from "@/lib/constants/calendar";
import type { MonthCalendar, CalendarItem } from "@/lib/queries/calendar";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function MonthGrid({
  calendar,
  year,
  month,
  selectedDay,
  onSelectItem,
}: {
  calendar: MonthCalendar;
  year: number;
  month: number;
  selectedDay: number | null;
  onSelectItem: (item: CalendarItem) => void;
}) {
  return (
    <div className="cal-grid">
      <div className="cal-weekdays">
        {WEEKDAY_LABEL_MON_FIRST_PT.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="cal-days">
        {Array.from({ length: calendar.startWeekday }).map((_, i) => (
          <div key={`empty-${i}`} className="cal-cell empty" />
        ))}
        {calendar.days.map((d) => (
          <div
            key={d.dateKey}
            className={`cal-cell clickable ${d.isToday ? "today" : ""} ${selectedDay === d.day ? "selected" : ""}`}
          >
            <Link
              href={`/calendar?year=${year}&month=${month}&day=${d.day}`}
              aria-label={`Ver ${d.day} de ${month}/${year}`}
              className="cal-cell-daylink"
            />
            <div className="cal-cell-content">
              <div className="dnum">{pad(d.day)}</div>
              {d.items.slice(0, 3).map((item) => (
                <div key={item.id} className="cal-cell-chip-wrap">
                  <EventChip item={item} onClick={() => onSelectItem(item)} />
                </div>
              ))}
              {d.items.length > 3 && <div className="cal-more">+{d.items.length - 3} eventos</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
