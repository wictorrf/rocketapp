"use client";

import { EventChip } from "./EventChip";
import { WEEKDAY_LABEL_MON_FIRST_PT } from "@/lib/constants/calendar";
import type { WeekCalendar, CalendarItem } from "@/lib/queries/calendar";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06h .. 23h

export function WeekView({
  calendar,
  onSelectItem,
  onCreateAt,
}: {
  calendar: WeekCalendar;
  onSelectItem: (item: CalendarItem) => void;
  onCreateAt: (dateKey: string, hour?: number) => void;
}) {
  return (
    <div className="week-grid">
      <div className="week-header-row">
        <div className="week-hour-col" />
        {calendar.days.map((d, i) => (
          <div key={d.dateKey} className={d.isToday ? "week-day-header today" : "week-day-header"}>
            <span>{WEEKDAY_LABEL_MON_FIRST_PT[i]}</span>
            <b>{d.day}</b>
          </div>
        ))}
      </div>

      <div className="week-allday-row">
        <div className="week-hour-col">Dia todo</div>
        {calendar.days.map((d) => (
          <div key={d.dateKey} className="week-allday-cell" onClick={() => onCreateAt(d.dateKey)}>
            {d.items
              .filter((i) => i.allDay || i.origin === "fsrs")
              .map((item) => (
                <EventChip
                  key={item.id}
                  item={item}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectItem(item);
                  }}
                />
              ))}
          </div>
        ))}
      </div>

      <div className="week-hours">
        {HOURS.map((hour) => (
          <div key={hour} className="week-hour-row">
            <div className="week-hour-col">{String(hour).padStart(2, "0")}:00</div>
            {calendar.days.map((d) => {
              const items = d.items.filter(
                (i) => !i.allDay && i.origin !== "fsrs" && i.startTime && Number(i.startTime.slice(0, 2)) === hour,
              );
              return (
                <div key={d.dateKey} className="week-hour-cell" onClick={() => onCreateAt(d.dateKey, hour)}>
                  {items.map((item) => (
                    <EventChip
                      key={item.id}
                      item={item}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item);
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
