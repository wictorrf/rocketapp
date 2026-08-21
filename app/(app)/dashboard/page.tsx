import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { computeStreak } from "@/lib/queries/streak";
import {
  getPriorityTask,
  getPerformanceDropInsight,
  getWeekStats,
  getWeekActivityDots,
  getTodayTasks,
} from "@/lib/queries/home";
import { getMonthCalendar, getMonthlyPlanMission, getUpcomingExams } from "@/lib/queries/calendar";
import { formatHours } from "@/lib/utils/format";
import { TodayTaskRow } from "@/components/home/TodayTaskRow";

const MONTH_NAMES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function examCountdownLabel(daysUntil: number) {
  if (daysUntil <= 0) return "hoje";
  if (daysUntil === 1) return "amanhã";
  return `${daysUntil} dias`;
}

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const now = new Date();
  const [streak, priorityTask, insight, weekStats, weekDots, todayTasks, monthCalendar, upcomingExams] =
    await Promise.all([
      computeStreak(profile.userId),
      getPriorityTask(profile.userId),
      getPerformanceDropInsight(profile.userId),
      getWeekStats(profile.userId),
      getWeekActivityDots(profile.userId),
      getTodayTasks(profile.userId),
      getMonthCalendar(profile.userId, now.getFullYear(), now.getMonth() + 1),
      getUpcomingExams(profile.userId),
    ]);

  const monthLabel = MONTH_NAMES_PT[now.getMonth()];
  const monthMission = monthCalendar.hasMonthlyPlan
    ? await getMonthlyPlanMission(profile.userId, now.getFullYear(), now.getMonth() + 1)
    : "";
  const nextExam = upcomingExams[0] ?? null;

  return (
    <div>
      <div className="grid cols-3">
        <div className="hero-greet">
          <div>
            <span className="script">Bem-vinda de volta,</span>
            <h2>{profile.displayName}</h2>
            <div className="sub">
              {streak > 0
                ? `Você está com uma sequência de ${streak} dia${streak > 1 ? "s" : ""} seguidos de estudo 👏`
                : "Comece hoje sua sequência de dias estudados."}
            </div>
          </div>
          {priorityTask && (
            <div className="today-pill">
              <div className="tp-label">Prioridade de hoje</div>
              <div className="tp-task">Revisão de {priorityTask.topicName}</div>
              <div className="tp-sub">
                {priorityTask.subjectName} · {priorityTask.cardCount}{" "}
                {priorityTask.cardCount > 1 ? "cartões" : "cartão"}, ~{priorityTask.estimatedMinutes} min
              </div>
            </div>
          )}
        </div>
      </div>

      {insight && (
        <div className="insight-card">
          <div className="ic-emoji">💡</div>
          <div>
            <b>Ponto de atenção</b>
            <span>
              Seu percentual de acerto em {insight.subjectName} caiu para {insight.recentAccuracyPct}%
              nas últimas 2 semanas. Considere revisar antes da próxima prova.
            </span>
          </div>
        </div>
      )}

      <div className="grid cols-3">
        <div className="card">
          <div className="eyebrow">Horas estudadas</div>
          <div className="stat-num">{formatHours(weekStats.studiedMinutes)}</div>
          <div className="stat-label">nos últimos 7 dias</div>
        </div>
        <div className="card">
          <div className="eyebrow">Questões resolvidas</div>
          <div className="stat-num">{weekStats.questionsDone}</div>
          <div className="stat-label">
            {weekStats.questionsAccuracyPct !== null
              ? `${weekStats.questionsAccuracyPct}% de acerto`
              : "nenhuma registrada ainda"}
          </div>
        </div>
        <div className="card-dark streak-card">
          <div className="eyebrow">Constância</div>
          <div className="flame">🔥</div>
          <div className="num">
            {streak} dia{streak !== 1 ? "s" : ""}
          </div>
          <div className="week-dots">
            {weekDots.map((d, i) => (
              <span key={i} className={d.done ? "done" : ""}>
                {d.letter}
              </span>
            ))}
          </div>
          {nextExam && (
            <div className="streak-next-exam">
              <span>Próxima prova</span>
              <b>{examCountdownLabel(nextExam.daysUntil)}</b>
              <em>{nextExam.title}</em>
            </div>
          )}
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h2 className="section-title">Tarefas de hoje</h2>
          {todayTasks.length === 0 && (
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
              Nada previsto pra hoje. Que tal criar novos flashcards ou avançar no conteúdo?
            </p>
          )}
          {todayTasks.map((t) => (
            <TodayTaskRow key={t.id} task={t} />
          ))}
        </div>
        <div className="card">
          <h2 className="section-title">Planejamento do mês</h2>
          {monthCalendar.hasMonthlyPlan ? (
            <>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: 15.5,
                  color: "var(--wine-deep)",
                  lineHeight: 1.5,
                  marginBottom: 16,
                }}
              >
                “{monthMission}”
              </p>
              <Link href={`/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`} className="btn btn-ghost btn-sm">
                Verificar calendário
              </Link>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
                {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} ainda não foi planejado. Reserve
                5 minutos para definir metas e deixar sua rotina no automático.
              </p>
              <Link
                href={`/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}&plan=1`}
                className="btn btn-primary btn-sm"
              >
                Planejar {monthLabel}
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="section-title">Próximas provas</h2>
        {upcomingExams.length === 0 ? (
          <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
            Nenhuma prova registrada ainda. Cadastre suas provas no Calendário pra acompanhar por aqui.
          </p>
        ) : (
          <div className="exam-list">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="exam-row">
                <div className="ex-icon">📝</div>
                <div className="ex-info">
                  <b>{exam.title}</b>
                  <span>
                    {new Date(`${exam.date}T00:00:00`).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                    })}
                  </span>
                </div>
                <div className={`ex-badge ${exam.daysUntil <= 0 ? "today" : ""}`}>
                  {examCountdownLabel(exam.daysUntil)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
