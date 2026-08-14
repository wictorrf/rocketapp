import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getMonthCalendar, getMonthlyPlanGoals } from "@/lib/queries/calendar";
import { RocketIcon } from "@/components/ui/RocketIcon";
import { NewTaskForm } from "@/components/calendar/NewTaskForm";
import { MonthlyPlanForm } from "@/components/calendar/MonthlyPlanForm";

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
  const { year: yearParam, month: monthParam, plan } = await searchParams;
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;

  const calendar = await getMonthCalendar(profile.userId, year, month);
  const monthLabel = MONTH_NAMES_PT[month - 1];
  const monthKey = `${year}-${String(month).padStart(2, "0")}-01`;

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  const showPlanForm = plan === "1" && !calendar.hasMonthlyPlan;
  const existingGoals = calendar.hasMonthlyPlan ? await getMonthlyPlanGoals(profile.userId, year, month) : "";

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
              {calendar.hasMonthlyPlan
                ? existingGoals
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

      <NewTaskForm />

      <div className="cal-toolbar">
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
            <span className="dot" style={{ background: "var(--pink)" }} /> Primeiro contato
          </div>
          <div className="li">
            <span className="dot" style={{ background: "var(--wine-deep)" }} /> Planejamento
          </div>
        </div>
      </div>

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
            <div
              key={d.dateKey}
              className={`cal-cell ${d.isToday ? "today" : ""} ${d.hasRitual ? "ritual-day" : ""}`}
            >
              <div className="dnum">{String(d.day).padStart(2, "0")}</div>
              {d.hasRitual && (
                <div className="ritual-star">
                  <RocketIcon size={12} />
                </div>
              )}
              {d.tasks.map((t) => (
                <div key={t.id} className={`cal-tag ${t.type}`}>
                  {t.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
