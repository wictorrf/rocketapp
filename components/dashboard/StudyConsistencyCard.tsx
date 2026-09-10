"use client";

import { useState } from "react";
import type { WeekStudyConsistency } from "@/lib/queries/streak";
import type { SubjectWithTopicsOption } from "@/lib/queries/subjects";
import { AddStudySessionModal } from "./AddStudySessionModal";

export function StudyConsistencyCard({
  consistency,
  subjects,
  todayDateKey,
}: {
  consistency: WeekStudyConsistency;
  subjects: SubjectWithTopicsOption[];
  todayDateKey: string;
}) {
  const [open, setOpen] = useState(false);
  const { currentStreak, longestStreak, weekActivity } = consistency;

  return (
    <div className="card">
      <h2 className="section-title">Constância de estudos</h2>

      <div className="consistency-stats">
        <div>
          <b>{currentStreak}</b>
          <span>Sequência atual: {currentStreak} {currentStreak === 1 ? "dia" : "dias"}</span>
        </div>
        <div>
          <b>{longestStreak}</b>
          <span>Maior sequência: {longestStreak} {longestStreak === 1 ? "dia" : "dias"}</span>
        </div>
      </div>

      <div className="consistency-week">
        {weekActivity.map((day) => (
          <div key={day.dateKey} className={`consistency-day${day.active ? " active" : ""}${day.dateKey === todayDateKey ? " today" : ""}`}>
            {day.weekdayLabel}
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        + Adicionar sessão de estudo
      </button>

      {open && <AddStudySessionModal subjects={subjects} defaultDate={todayDateKey} onClose={() => setOpen(false)} />}
    </div>
  );
}
