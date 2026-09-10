"use client";

import { useState } from "react";
import Link from "next/link";
import { MonthGrid } from "./MonthGrid";
import { WeekView } from "./WeekView";
import { ViewSwitcher, type CalendarView } from "./ViewSwitcher";
import { EventFormPanel } from "./EventFormPanel";
import { EventRow } from "./EventRow";
import { CalendarFilters, EMPTY_CALENDAR_FILTERS, applyCalendarFilters, type CalendarFilterState } from "./CalendarFilters";
import type { MonthCalendar, WeekCalendar, CalendarItem } from "@/lib/queries/calendar";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

export function CalendarShell({
  view,
  hasExplicitView,
  monthLabel,
  year,
  month,
  selectedDay,
  monthCalendar,
  weekCalendar,
  prevHref,
  nextHref,
  headerLabel,
  subjects,
  referenceDateKey,
}: {
  view: CalendarView;
  hasExplicitView: boolean;
  monthLabel: string;
  year: number;
  month: number;
  selectedDay: number | null;
  monthCalendar: MonthCalendar | null;
  weekCalendar: WeekCalendar | null;
  prevHref: string;
  nextHref: string;
  headerLabel: string;
  subjects: SubjectWithTopicsOption[];
  referenceDateKey: string;
}) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ date?: string; startTime?: string }>({});
  const [filters, setFilters] = useState<CalendarFilterState>(EMPTY_CALENDAR_FILTERS);

  function openCreate(date?: string, hour?: number) {
    setCreateDefaults({ date, startTime: hour !== undefined ? `${String(hour).padStart(2, "0")}:00` : undefined });
    setShowCreate(true);
  }

  function closeForm() {
    setSelectedEvent(null);
    setShowCreate(false);
  }

  const selectedDayEntry =
    view === "month" && selectedDay ? (monthCalendar?.days.find((d) => d.day === selectedDay) ?? null) : null;

  return (
    <div className="calendar-page">
      <h2 className="section-title">Calendário</h2>
      <p className="muted-note">Organize seus compromissos e tenha clareza sobre o que vem pela frente.</p>

      <div className="cal-toolbar" style={{ marginTop: 20 }}>
        <div className="cal-nav">
          <Link href={prevHref} aria-label="Anterior" className="cal-nav-arrow">
            ‹
          </Link>
          <div className="cal-month">{headerLabel}</div>
          <Link href={nextHref} aria-label="Próximo" className="cal-nav-arrow">
            ›
          </Link>
          <CalendarFilters value={filters} onChange={setFilters} subjects={subjects} />
        </div>
        <div className="cal-toolbar-right">
          <ViewSwitcher current={view} hasExplicitView={hasExplicitView} referenceDateKey={referenceDateKey} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openCreate()}>
            + Novo evento
          </button>
        </div>
      </div>

      {view === "month" && monthCalendar && (
        <>
          <MonthGrid
            calendar={{
              ...monthCalendar,
              days: monthCalendar.days.map((d) => ({ ...d, items: applyCalendarFilters(d.items, filters) })),
            }}
            year={year}
            month={month}
            selectedDay={selectedDay}
            onSelectItem={setSelectedEvent}
          />

          {selectedDayEntry && (
            <div className="card" style={{ marginTop: 20 }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                {selectedDayEntry.day} de {monthLabel}
              </h2>
              <div style={{ marginTop: 14 }} />
              {applyCalendarFilters(selectedDayEntry.items, filters).length === 0 ? (
                <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Nada programado pra esse dia.</p>
              ) : (
                <div className="day-detail-list">
                  {applyCalendarFilters(selectedDayEntry.items, filters).map((item) => (
                    <EventRow key={item.id} item={item} onEdit={setSelectedEvent} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {view === "week" && weekCalendar && (
        <WeekView
          calendar={{
            ...weekCalendar,
            days: weekCalendar.days.map((d) => ({ ...d, items: applyCalendarFilters(d.items, filters) })),
          }}
          onSelectItem={setSelectedEvent}
          onCreateAt={(dateKey, hour) => openCreate(dateKey, hour)}
        />
      )}

      {(showCreate || selectedEvent) && (
        <EventFormPanel
          open
          onClose={closeForm}
          subjects={subjects}
          event={selectedEvent}
          defaultDate={createDefaults.date}
          defaultStartTime={createDefaults.startTime}
        />
      )}
    </div>
  );
}
