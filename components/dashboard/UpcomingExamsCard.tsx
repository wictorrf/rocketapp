"use client";

import { useState } from "react";
import { TASK_TYPE_LABEL } from "@/lib/constants/calendar";
import type { UpcomingExam } from "@/lib/queries/calendar";
import type { CalendarItem } from "@/lib/queries/calendar";

const DASHBOARD_EXAMS_LIMIT = 3;

function countdownLabel(daysUntil: number) {
  if (daysUntil <= 0) return "hoje";
  if (daysUntil === 1) return "amanhã";
  return `${daysUntil} dias`;
}

function ExamRow({ exam, onEdit, compact }: { exam: UpcomingExam; onEdit: (event: CalendarItem) => void; compact: boolean }) {
  return (
    <button
      type="button"
      className={`exam-row exam-row-btn ${compact ? "exam-row-compact" : ""}`}
      onClick={() => onEdit(exam)}
    >
      <div className="ex-icon">{exam.emoji || (exam.type === "prova" ? "📝" : "📌")}</div>
      <div className="ex-info">
        <b>{exam.title}</b>
        <span>
          {exam.typeCustom || TASK_TYPE_LABEL[exam.type] || exam.type}
          {" · "}
          {new Date(`${exam.scheduledDate}T00:00:00`).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
          })}
          {exam.subjectName ? ` · ${exam.subjectName}` : ""}
        </span>
      </div>
      <div className={`ex-badge ${exam.daysUntil <= 0 ? "today" : ""}`}>{countdownLabel(exam.daysUntil)}</div>
    </button>
  );
}

export function UpcomingExamsCard({ exams, onEdit, onCreate }: { exams: UpcomingExam[]; onEdit: (event: CalendarItem) => void; onCreate: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const visibleExams = exams.slice(0, DASHBOARD_EXAMS_LIMIT);
  const hasMore = exams.length > DASHBOARD_EXAMS_LIMIT;

  return (
    <div className="card card-highlight card-compact">
      <div className="card-highlight-head">
        <h2 className="section-title">Próximas provas e compromissos</h2>
        {hasMore && (
          <button type="button" className="see-all-link" onClick={() => setShowAll(true)}>
            Ver todos
          </button>
        )}
      </div>
      {visibleExams.length === 0 ? (
        <p className="muted-note">
          Nenhuma prova ou compromisso registrado ainda. Cadastre no Calendário pra acompanhar por aqui.
        </p>
      ) : (
        <div className="exam-list exam-list-compact">
          {visibleExams.map((exam) => (
            <ExamRow key={exam.id} exam={exam} onEdit={onEdit} compact />
          ))}
        </div>
      )}
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={onCreate}>
        + Adicionar compromisso
      </button>

      {showAll && (
        <div className="modal-overlay" onClick={() => setShowAll(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h2>Próximas provas e compromissos</h2>
              <button type="button" className="icon-btn" onClick={() => setShowAll(false)} aria-label="Fechar">
                ✕
              </button>
            </div>
            <div className="exam-list">
              {exams.map((exam) => (
                <ExamRow
                  key={exam.id}
                  exam={exam}
                  onEdit={(event) => {
                    setShowAll(false);
                    onEdit(event);
                  }}
                  compact={false}
                />
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ marginTop: 14 }}
              onClick={() => {
                setShowAll(false);
                onCreate();
              }}
            >
              + Adicionar compromisso
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
