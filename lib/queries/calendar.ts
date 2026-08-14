import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/utils/format";

function firstOfMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export type DayEntry = {
  day: number;
  dateKey: string;
  isToday: boolean;
  hasRitual: boolean;
  tasks: { id: string; type: "revisao" | "prova" | "contato" | "ritual"; title: string }[];
};

export type MonthCalendar = {
  year: number;
  month: number; // 1-12
  daysInMonth: number;
  startWeekday: number; // 0 = segunda .. 6 = domingo
  days: DayEntry[];
  hasMonthlyPlan: boolean;
};

export async function getMonthCalendar(
  userId: string,
  year: number,
  month: number,
): Promise<MonthCalendar> {
  const supabase = await createClient();

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = firstOfMonthKey(year, month);
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const jsStartWeekday = new Date(year, month - 1, 1).getDay(); // 0 = domingo
  const startWeekday = (jsStartWeekday + 6) % 7; // 0 = segunda

  const [{ data: manualTasks }, { data: dueFlashcards }, { data: monthlyPlan }] = await Promise.all([
    supabase
      .from("calendar_tasks")
      .select("id, type, title, scheduled_date")
      .eq("user_id", userId)
      .gte("scheduled_date", monthStart)
      .lte("scheduled_date", monthEnd),
    supabase
      .from("flashcards")
      .select("id, flashcard_srs_state!inner(due_at)")
      .eq("user_id", userId)
      .gte("flashcard_srs_state.due_at", monthStart)
      .lte("flashcard_srs_state.due_at", monthEnd),
    supabase
      .from("monthly_plans")
      .select("id")
      .eq("user_id", userId)
      .eq("month", monthStart)
      .maybeSingle(),
  ]);

  const revisaoCountByDay = new Map<string, number>();
  for (const f of dueFlashcards ?? []) {
    const srs = Array.isArray(f.flashcard_srs_state) ? f.flashcard_srs_state[0] : f.flashcard_srs_state;
    const dueAt = srs?.due_at;
    if (!dueAt) continue;
    revisaoCountByDay.set(dueAt, (revisaoCountByDay.get(dueAt) ?? 0) + 1);
  }

  const todayKey = toLocalDateKey(new Date());
  const days: DayEntry[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const tasks: DayEntry["tasks"] = (manualTasks ?? [])
      .filter((t) => t.scheduled_date === dateKey)
      .map((t) => ({ id: t.id, type: t.type as DayEntry["tasks"][number]["type"], title: t.title }));

    const revisaoCount = revisaoCountByDay.get(dateKey) ?? 0;
    if (revisaoCount > 0) {
      tasks.unshift({
        id: `revisao-${dateKey}`,
        type: "revisao",
        title: `Revisão · ${revisaoCount} ${revisaoCount > 1 ? "cartões" : "cartão"}`,
      });
    }

    days.push({
      day,
      dateKey,
      isToday: dateKey === todayKey,
      hasRitual: day === 1 && Boolean(monthlyPlan),
      tasks,
    });
  }

  return {
    year,
    month,
    daysInMonth,
    startWeekday,
    days,
    hasMonthlyPlan: Boolean(monthlyPlan),
  };
}

export async function getMonthlyPlanGoals(userId: string, year: number, month: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("monthly_plans")
    .select("goals")
    .eq("user_id", userId)
    .eq("month", firstOfMonthKey(year, month))
    .maybeSingle();
  return (data?.goals as { text?: string } | null)?.text ?? "";
}
