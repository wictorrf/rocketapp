import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import {
  getMonthCalendar,
  getWeekCalendar,
  getAgendaAnchorDate,
  getAgendaDay,
  getMonthlyPlan,
  getMonthlyPlanActions,
  type CalendarItem,
} from "@/lib/queries/calendar";
import { listActiveSubjectsWithTopics } from "@/lib/queries/subjects";
import { toLocalDateKey } from "@/lib/utils/format";
import { CalendarShell } from "@/components/calendar/CalendarShell";
import type { CalendarView } from "@/components/calendar/ViewSwitcher";

const MONTH_NAMES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function mondayOf(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  const diff = (d.getDay() + 6) % 7; // dias desde a última segunda (0=segunda)
  d.setDate(d.getDate() - diff);
  return toLocalDateKey(d);
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const now = new Date();
  const sp = await searchParams;

  const viewParam = first(sp.view);
  const view: CalendarView = viewParam === "week" || viewParam === "agenda" ? viewParam : "month";
  const hasExplicitView = Boolean(viewParam);

  const year = Number(first(sp.year)) || now.getFullYear();
  const month = Number(first(sp.month)) || now.getMonth() + 1;
  const selectedDay = Number(first(sp.day)) || null;
  const todayKey = toLocalDateKey(now);
  const weekStart = first(sp.weekStart) || mondayOf(todayKey);
  const agendaDateParam = first(sp.date) ?? null;

  const monthLabel = MONTH_NAMES_PT[month - 1];
  const monthKey = `${year}-${pad(month)}-01`;

  const [subjects, monthlyPlan] = await Promise.all([
    listActiveSubjectsWithTopics(profile.userId),
    getMonthlyPlan(profile.userId, year, month),
  ]);
  const planActions = monthlyPlan ? await getMonthlyPlanActions(profile.userId, monthlyPlan.id) : [];
  const planStartExpanded = first(sp.plan) === "1";

  let monthCalendar = null;
  let weekCalendar = null;
  let agendaAnchorDateKey: string | null = null;
  let agendaItems: CalendarItem[] = [];
  const agendaIsSpecificDay = Boolean(agendaDateParam);

  if (view === "month") {
    monthCalendar = await getMonthCalendar(profile.userId, year, month);
  } else if (view === "week") {
    weekCalendar = await getWeekCalendar(profile.userId, weekStart);
  } else {
    agendaAnchorDateKey = agendaDateParam ?? (await getAgendaAnchorDate(profile.userId, todayKey));
    if (agendaAnchorDateKey) agendaItems = await getAgendaDay(profile.userId, agendaAnchorDateKey);
  }

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const prevWeek = (() => {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() - 7);
    return toLocalDateKey(d);
  })();
  const nextWeek = (() => {
    const d = new Date(`${weekStart}T00:00:00`);
    d.setDate(d.getDate() + 7);
    return toLocalDateKey(d);
  })();

  let prevHref = "#";
  let nextHref = "#";
  let todayHref = "/calendar";
  let headerLabel = "";

  if (view === "month") {
    prevHref = `/calendar?view=month&year=${prevMonth.year}&month=${prevMonth.month}`;
    nextHref = `/calendar?view=month&year=${nextMonth.year}&month=${nextMonth.month}`;
    todayHref = `/calendar?view=month&year=${now.getFullYear()}&month=${now.getMonth() + 1}`;
    headerLabel = `${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)} ${year}`;
  } else if (view === "week") {
    prevHref = `/calendar?view=week&weekStart=${prevWeek}`;
    nextHref = `/calendar?view=week&weekStart=${nextWeek}`;
    todayHref = `/calendar?view=week&weekStart=${mondayOf(todayKey)}`;
    const weekEnd = weekCalendar?.days[6]?.dateKey ?? weekStart;
    headerLabel = `${new Date(`${weekStart}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${new Date(`${weekEnd}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
  } else {
    const anchor = agendaAnchorDateKey ?? todayKey;
    const prevDay = (() => {
      const d = new Date(`${anchor}T00:00:00`);
      d.setDate(d.getDate() - 1);
      return toLocalDateKey(d);
    })();
    const nextDay = (() => {
      const d = new Date(`${anchor}T00:00:00`);
      d.setDate(d.getDate() + 1);
      return toLocalDateKey(d);
    })();
    prevHref = `/calendar?view=agenda&date=${prevDay}`;
    nextHref = `/calendar?view=agenda&date=${nextDay}`;
    todayHref = "/calendar?view=agenda";
    headerLabel = "Agenda";
  }

  return (
    <CalendarShell
      view={view}
      hasExplicitView={hasExplicitView}
      monthLabel={monthLabel}
      monthKey={monthKey}
      year={year}
      month={month}
      selectedDay={selectedDay}
      monthCalendar={monthCalendar}
      weekCalendar={weekCalendar}
      agendaAnchorDateKey={agendaAnchorDateKey}
      agendaItems={agendaItems}
      agendaIsSpecificDay={agendaIsSpecificDay}
      prevHref={prevHref}
      nextHref={nextHref}
      todayHref={todayHref}
      headerLabel={headerLabel}
      subjects={subjects}
      monthlyPlan={monthlyPlan}
      planActions={planActions}
      planStartExpanded={planStartExpanded}
    />
  );
}
