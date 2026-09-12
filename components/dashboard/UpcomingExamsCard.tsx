import Link from "next/link";
import { TASK_TYPE_LABEL } from "@/lib/constants/calendar";
import type { UpcomingExam } from "@/lib/queries/calendar";
import type { CalendarItem } from "@/lib/queries/calendar";

const DASHBOARD_EXAMS_LIMIT = 3;

function countdownLabel(daysUntil: number) {
  if (daysUntil <= 0) return "hoje";
  if (daysUntil === 1) return "amanhã";
  return `${daysUntil} dias`;
}

export function UpcomingExamsCard({ exams, onEdit, onCreate }: { exams: UpcomingExam[]; onEdit: (event: CalendarItem) => void; onCreate: () => void }) {
  const visibleExams = exams.slice(0, DASHBOARD_EXAMS_LIMIT);
  const hasMore = exams.length > DASHBOARD_EXAMS_LIMIT;

  return (
    <div className="card card-highlight card-compact">
      <div className="card-highlight-head">
        <h2 className="section-title">Próximas provas e compromissos</h2>
        {hasMore && (
          <Link href="/calendar" className="see-all-link">
            Ver todos
          </Link>
        )}
      </div>
      {visibleExams.length === 0 ? (
        <p className="muted-note">
          Nenhuma prova ou compromisso registrado ainda. Cadastre no Calendário pra acompanhar por aqui.
        </p>
      ) : (
        <div className="exam-list exam-list-compact">
          {visibleExams.map((exam) => (
            <button key={exam.id} type="button" className="exam-row exam-row-compact exam-row-btn" onClick={() => onEdit(exam)}>
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
          ))}
        </div>
      )}
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={onCreate}>
        + Adicionar compromisso
      </button>
    </div>
  );
}
