"use client";

import { useState } from "react";
import { EventFormPanel } from "@/components/calendar/EventFormPanel";
import { IndicatorsGrid } from "./IndicatorsGrid";
import { QuestionLogQuickEntry } from "./QuestionLogQuickEntry";
import { TodayChecklistCard } from "./TodayChecklistCard";
import { UpcomingExamsCard } from "./UpcomingExamsCard";
import { StudyConsistencyCard } from "./StudyConsistencyCard";
import type { DayChecklist } from "@/lib/queries/home";
import type { CalendarItem, UpcomingExam } from "@/lib/queries/calendar";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";
import type { FlashcardMetrics, QuestionMetrics, StudyTimeMetrics } from "@/lib/queries/metrics";
import type { WeekStudyConsistency } from "@/lib/queries/streak";

// Dono do estado do EventFormPanel compartilhado entre o Checklist de hoje e
// Próximas provas e compromissos (mesmo papel que o CalendarShell cumpre no
// Calendário).
export function DashboardShell({
  subjects,
  todayChecklist,
  upcomingExams,
  indicators,
  consistency,
  todayDateKey,
}: {
  subjects: SubjectWithTopicsOption[];
  todayChecklist: DayChecklist;
  upcomingExams: UpcomingExam[];
  indicators: { flashcardMetrics: FlashcardMetrics; questionMetrics: QuestionMetrics; studyTimeMetrics: StudyTimeMetrics };
  consistency: WeekStudyConsistency;
  todayDateKey: string;
}) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string | undefined>(undefined);

  function openCreate() {
    setCreateDefaultDate(todayDateKey);
    setShowCreate(true);
  }
  function closeForm() {
    setSelectedEvent(null);
    setShowCreate(false);
  }

  return (
    <>
      <div className="dashboard-top-row" style={{ marginTop: 18 }}>
        <IndicatorsGrid
          flashcardMetrics={indicators.flashcardMetrics}
          questionMetrics={indicators.questionMetrics}
          studyTimeMetrics={indicators.studyTimeMetrics}
          onRegisterQuestions={<QuestionLogQuickEntry subjects={subjects} />}
        />
        <UpcomingExamsCard exams={upcomingExams} onEdit={setSelectedEvent} onCreate={openCreate} />
      </div>

      <div style={{ marginTop: 18 }}>
        <TodayChecklistCard checklist={todayChecklist} onEdit={setSelectedEvent} onCreate={openCreate} />
      </div>

      <div style={{ marginTop: 18 }}>
        <StudyConsistencyCard consistency={consistency} subjects={subjects} todayDateKey={todayDateKey} />
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
