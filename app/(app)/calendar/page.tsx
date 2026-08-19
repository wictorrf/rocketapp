import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getMonthCalendar, getMonthlyPlan } from "@/lib/queries/calendar";
import { RocketIcon } from "@/components/ui/RocketIcon";
import { NewEventModal } from "@/components/calendar/NewEventModal";
import { MonthlyPlanForm } from "@/components/calendar/MonthlyPlanForm";
import { MonthlyPlanViewer } from "@/components/calendar/MonthlyPlanViewer";
import { TASK_TYPE_LABEL, resolveTaskColor } from "@/lib/constants/calendar";

const MONTH_NAMES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const now = new Date();
  const { year: yearParam, month: monthParam, plan, day: dayParam } = await searchParams;
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;
  const selectedDay = Number(dayParam) || null;

  const calendar = await getMonthCalendar(profile.userId, year, month);
  const monthLabel = MONTH_NAMES_PT[month - 1];
  const monthKey = `${year}-${String(month).padStart(2, "0")}-01`;

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  const showPlanForm = plan === "1" && !calendar.hasMonthlyPlan;
  const monthlyPlan = calendar.hasMonthlyPlan ? await getMonthlyPlan(profile.userId, year, month) : null;

  const selectedDayEntry = selectedDay ? calendar.days.find((d) => d.day === selectedDay) : null;

  return (
    <div>
      <div className="ritual-banner">
        <div className="rb-left">
          <div className="rb-icon">
            <RocketIcon size={20} />
          </div>
          <div>
            <b>Ritual de planejamento mensal</b>
            <span>
              {monthlyPlan
                ? monthlyPlan.goals.mission
                : `Defina suas metas de ${monthLabel} e deixe a rotina organizada automaticamente`}
            </span>
          </div>
        </div>
        {!calendar.hasMonthlyPlan && (
          <Link href={`/calendar?year=${year}&month=${month}&plan=1`} className="btn btn-pink btn-sm">
            Começar planejamento
          </Link>
        )}
      </div>

      {showPlanForm && <MonthlyPlanForm month={monthKey} monthLabel={monthLabel} />}
      {monthlyPlan && <MonthlyPlanViewer plan={monthlyPlan} month={monthKey} monthLabel={monthLabel} />}

      <div className="cal-toolbar" style={{ marginTop: 24 }}>
        <div className="cal-nav">
          <Link href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`} aria-label="Mês anterior">
            ‹
          </Link>
          <div className="cal-month">
            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} {year}
          </div>
          <Link href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`} aria-label="Próximo mês">
            ›
          </Link>
        </div>
        <div className="legend">
          <div className="li">
            <span className="dot" style={{ background: "var(--green)" }} /> Revisão
          </div>
          <div className="li">
            <span className="dot" style={{ background: "var(--wine)" }} /> Prova/Simulado
          </div>
          <div className="li">
            <span className="dot" style={{ background: "var(--coal)" }} /> Questões
          </div>
          <div className="li">
            <span className="dot" style={{ background: "var(--pink)" }} /> Primeiro contato
          </div>
          <div className="li">
            <span className="dot" style={{ background: "var(--amber)" }} /> Aula
          </div>
          <div className="li">
            <span className="dot" style={{ background: "var(--wine-deep)" }} /> Planejamento
          </div>
        </div>
      </div>

      <NewEventModal />

      <div className="cal-grid">
        <div className="cal-weekdays">
          {WEEKDAYS_PT.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="cal-days">
          {Array.from({ length: calendar.startWeekday }).map((_, i) => (
            <div key={`empty-${i}`} className="cal-cell empty" />
          ))}
          {calendar.days.map((d) => (
            <Link
              key={d.dateKey}
              href={`/calendar?year=${year}&month=${month}&day=${d.day}`}
              className={`cal-cell clickable ${d.isToday ? "today" : ""} ${d.hasRitual ? "ritual-day" : ""} ${selectedDay === d.day ? "selected" : ""}`}
            >
              <div className="dnum">{String(d.day).padStart(2, "0")}</div>
              {d.hasRitual && (
                <div className="ritual-star">
                  <RocketIcon size={12} />
                </div>
              )}
              {d.tasks.map((t) => (
                <div
                  key={t.id}
                  className={`cal-tag ${t.color ? "" : t.type}`}
                  style={t.color ? { background: t.color } : undefined}
                >
                  {t.emoji ? `${t.emoji} ` : ""}
                  {t.title}
                </div>
              ))}
            </Link>
          ))}
        </div>
      </div>

      {selectedDayEntry && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 className="section-title">
            {selectedDayEntry.day} de {monthLabel}
          </h2>
          {selectedDayEntry.tasks.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Nada programado pra esse dia.</p>
          ) : (
            <div className="day-detail-list">
              {selectedDayEntry.tasks.map((t) => (
                <div key={t.id} className="day-detail-row">
                  <div className="dd-dot" style={{ background: resolveTaskColor(t) }} />
                  <div className="dd-body">
                    <b>
                      {t.emoji ? `${t.emoji} ` : ""}
                      {t.title}
                    </b>
                    <div className="dd-meta">
                      <span>{TASK_TYPE_LABEL[t.type] ?? t.type}</span>
                      {t.time && <span>🕐 {t.time.slice(0, 5)}</span>}
                      {t.location && <span>📍 {t.location}</span>}
                    </div>
                    {t.notes && <div className="dd-notes">{t.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
