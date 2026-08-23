"use client";

import { useState } from "react";
import { EventFormPanel } from "@/components/calendar/EventFormPanel";
import { TodayChecklistCard } from "./TodayChecklistCard";
import { WeekChecklistCard } from "./WeekChecklistCard";
import { FlashcardReviewCard } from "./FlashcardReviewCard";
import { MonthPlanCard } from "./MonthPlanCard";
import { UpcomingExamsCard } from "./UpcomingExamsCard";
import type { DayChecklist, WeekChecklist, FlashcardReviewHighlight, MonthPlanSummary } from "@/lib/queries/home";
import type { CalendarItem, UpcomingExam } from "@/lib/queries/calendar";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";

// Dono do estado do EventFormPanel compartilhado — mesmo papel que o
// CalendarShell cumpre no Calendário, só que aqui alimentado pelas seções
// do Dashboard (checklist de hoje, checklist da semana, próximas provas).
export function DashboardShell({
  subjects,
  todayChecklist,
  weekChecklist,
  flashcardHighlight,
  monthPlanSummary,
  monthPlanYear,
  monthPlanMonth,
  monthLabel,
  upcomingExams,
}: {
  subjects: SubjectWithTopicsOption[];
  todayChecklist: DayChecklist;
  weekChecklist: WeekChecklist;
  flashcardHighlight: FlashcardReviewHighlight;
  monthPlanSummary: MonthPlanSummary;
  monthPlanYear: number;
  monthPlanMonth: number;
  monthLabel: string;
  upcomingExams: UpcomingExam[];
}) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>(undefined);

  function openCreate() {
    setCreateDefaultDate(undefined);
    setShowCreate(true);
  }
  function closeForm() {
    setSelectedEvent(null);
    setShowCreate(false);
  }

  return (
    <>
      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <TodayChecklistCard checklist={todayChecklist} onEdit={setSelectedEvent} />
        <FlashcardReviewCard highlight={flashcardHighlight} />
      </div>

      <div style={{ marginTop: 18 }}>
        <WeekChecklistCard checklist={weekChecklist} onEdit={setSelectedEvent} onCreate={openCreate} />
      </div>

      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <MonthPlanCard summary={monthPlanSummary} year={monthPlanYear} month={monthPlanMonth} monthLabel={monthLabel} />
        <UpcomingExamsCard exams={upcomingExams} onEdit={setSelectedEvent} />
      </div>

      {(showCreate || selectedEvent) && (
        <EventFormPanel
          open
          onClose={closeForm}
          subjects={subjects}
          event={selectedEvent}
          defaultDate={createDefaultDate}
        />
      )}
    </>
  );
}
