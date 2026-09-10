import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getMonthCalendar, getWeekCalendar } from "@/lib/queries/calendar";
import { listActiveSubjectsWithTopics } from "@/lib/queries/subjects";
import { toLocalDateKey, dateKeyToUtcDate, addDaysToKey } from "@/lib/utils/format";
import { getUserTimezone } from "@/lib/utils/timezone";
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
  const diff = (dateKeyToUtcDate(dateKey).getUTCDay() + 6) % 7; // dias desde a última segunda (0=segunda)
  return addDaysToKey(dateKey, -diff);
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const timeZone = await getUserTimezone();
  const todayKey = toLocalDateKey(new Date(), timeZone);
  const sp = await searchParams;

  const viewParam = first(sp.view);
  const view: CalendarView = viewParam === "week" ? "week" : "month";
  const hasExplicitView = Boolean(viewParam);

  const [todayYear, todayMonth] = todayKey.split("-").map(Number);
  const year = Number(first(sp.year)) || todayYear;
  const month = Number(first(sp.month)) || todayMonth;
  const selectedDay = Number(first(sp.day)) || null;
  const weekStart = first(sp.weekStart) || mondayOf(todayKey);

  const monthLabel = MONTH_NAMES_PT[month - 1];

  const subjects = await listActiveSubjectsWithTopics(profile.userId);

  const monthCalendar = view === "month" ? await getMonthCalendar(profile.userId, year, month, timeZone) : null;
  const weekCalendar = view === "week" ? await getWeekCalendar(profile.userId, weekStart, timeZone) : null;

  // Data de referência do que está sendo visto agora — usada pelo
  // ViewSwitcher pra abrir a view seguinte (mês/semana) já no período
  // certo, em vez de sempre voltar pra hoje.
  const referenceDateKey =
    view === "week"
      ? weekStart
      : selectedDay
        ? `${year}-${pad(month)}-${pad(selectedDay)}`
        : year === todayYear && month === todayMonth
          ? todayKey
          : `${year}-${pad(month)}-01`;

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const prevWeek = addDaysToKey(weekStart, -7);
  const nextWeek = addDaysToKey(weekStart, 7);

  let prevHref = "#";
  let nextHref = "#";
  let headerLabel = "";

  if (view === "month") {
    prevHref = `/calendar?view=month&year=${prevMonth.year}&month=${prevMonth.month}`;
    nextHref = `/calendar?view=month&year=${nextMonth.year}&month=${nextMonth.month}`;
    headerLabel = `${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)} ${year}`;
  } else {
    prevHref = `/calendar?view=week&weekStart=${prevWeek}`;
    nextHref = `/calendar?view=week&weekStart=${nextWeek}`;
    const weekEnd = weekCalendar?.days[6]?.dateKey ?? weekStart;
    headerLabel = `${dateKeyToUtcDate(weekStart).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })} – ${dateKeyToUtcDate(weekEnd).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })}`;
  }

  return (
    <CalendarShell
      view={view}
      hasExplicitView={hasExplicitView}
      monthLabel={monthLabel}
      year={year}
      month={month}
      selectedDay={selectedDay}
      monthCalendar={monthCalendar}
      weekCalendar={weekCalendar}
      prevHref={prevHref}
      nextHref={nextHref}
      headerLabel={headerLabel}
      subjects={subjects}
      referenceDateKey={referenceDateKey}
    />
  );
}
