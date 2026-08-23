"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MonthGrid } from "./MonthGrid";
import { WeekView } from "./WeekView";
import { AgendaView } from "./AgendaView";
import { ViewSwitcher, type CalendarView } from "./ViewSwitcher";
import { EventFormPanel } from "./EventFormPanel";
import { EventRow } from "./EventRow";
import { CalendarFilters, EMPTY_CALENDAR_FILTERS, applyCalendarFilters, type CalendarFilterState } from "./CalendarFilters";
import { MonthlyPlanPanel } from "./MonthlyPlanPanel";
import type { MonthCalendar, WeekCalendar, CalendarItem, MonthlyPlan, MonthlyPlanAction } from "@/lib/queries/calendar";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

export function CalendarShell({
  view,
  hasExplicitView,
  monthLabel,
  monthKey,
  year,
  month,
  selectedDay,
  monthCalendar,
  weekCalendar,
  agendaAnchorDateKey,
  agendaItems,
  agendaIsSpecificDay,
  prevHref,
  nextHref,
  todayHref,
  headerLabel,
  subjects,
  monthlyPlan,
  planActions,
  planStartExpanded,
  referenceDateKey,
}: {
  view: CalendarView;
  hasExplicitView: boolean;
  monthLabel: string;
  monthKey: string;
  year: number;
  month: number;
  selectedDay: number | null;
  monthCalendar: MonthCalendar | null;
  weekCalendar: WeekCalendar | null;
  agendaAnchorDateKey: string | null;
  agendaItems: CalendarItem[];
  agendaIsSpecificDay: boolean;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  headerLabel: string;
  subjects: SubjectWithTopicsOption[];
  monthlyPlan: MonthlyPlan | null;
  planActions: MonthlyPlanAction[];
  planStartExpanded: boolean;
  referenceDateKey: string;
}) {
  const router = useRouter();
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
    <div>
      <MonthlyPlanPanel
        month={monthKey}
        monthLabel={monthLabel}
        plan={monthlyPlan}
        planActions={planActions}
        subjects={subjects}
        startExpanded={planStartExpanded}
      />

      <div className="cal-toolbar" style={{ marginTop: 24 }}>
        <div className="cal-nav">
          <Link href={prevHref} aria-label="Anterior">
            ‹
          </Link>
          <div className="cal-month">{headerLabel}</div>
          <Link href={nextHref} aria-label="Próximo">
            ›
          </Link>
          <Link href={todayHref} className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }}>
            Hoje
          </Link>
        </div>
        <ViewSwitcher current={view} hasExplicitView={hasExplicitView} referenceDateKey={referenceDateKey} />
      </div>

      <div className="cal-toolbar">
        <CalendarFilters value={filters} onChange={setFilters} subjects={subjects} />
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openCreate(view === "agenda" ? (agendaAnchorDateKey ?? undefined) : undefined)}>
          + Novo evento
        </button>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  {selectedDayEntry.day} de {monthLabel}
                </h2>
                <Link href={`/calendar?view=agenda&date=${selectedDayEntry.dateKey}`} className="btn btn-ghost btn-sm">
                  Ver na agenda
                </Link>
              </div>
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

      {view === "agenda" && (
        <AgendaView
          anchorDateKey={agendaAnchorDateKey}
          items={applyCalendarFilters(agendaItems, filters)}
          isSpecificDay={agendaIsSpecificDay}
          onEdit={setSelectedEvent}
          onBackToUpcoming={() => router.push("/calendar?view=agenda")}
          onCreate={() => openCreate()}
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
