import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/utils/format";

function firstOfMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export type CalendarTaskEntry = {
  id: string;
  type: "revisao" | "prova" | "contato" | "ritual" | "aula" | "questoes";
  title: string;
  color: string | null;
  emoji: string | null;
  time: string | null;
  location: string | null;
  notes: string | null;
  status: "pending" | "done";
};

export type DayEntry = {
  day: number;
  dateKey: string;
  isToday: boolean;
  hasRitual: boolean;
  tasks: CalendarTaskEntry[];
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
      .select("id, type, title, scheduled_date, scheduled_time, color, emoji, location, notes, status")
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
      .map((t) => ({
        id: t.id,
        type: t.type as CalendarTaskEntry["type"],
        title: t.title,
        color: t.color,
        emoji: t.emoji,
        time: t.scheduled_time,
        location: t.location,
        notes: t.notes,
        status: t.status as "pending" | "done",
      }));

    const revisaoCount = revisaoCountByDay.get(dateKey) ?? 0;
    if (revisaoCount > 0) {
      tasks.unshift({
        id: `revisao-${dateKey}`,
        type: "revisao",
        title: `Revisão · ${revisaoCount} ${revisaoCount > 1 ? "cartões" : "cartão"}`,
        color: null,
        emoji: null,
        time: null,
        location: null,
        notes: null,
        status: "pending",
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

export type MonthlyPlanPillar = {
  key: string;
  purpose: string;
  objectives: string[];
};

export type MonthlyPlanGoals = {
  mission: string;
  pillars: MonthlyPlanPillar[];
  mainGoals: { pillarKey: string; text: string }[];
  review: string | null;
};

export type MonthlyPlan = {
  goals: MonthlyPlanGoals;
  completedAt: string | null;
  reviewedAt: string | null;
};

export async function getMonthlyPlan(userId: string, year: number, month: number): Promise<MonthlyPlan | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("monthly_plans")
    .select("goals, completed_at, reviewed_at")
    .eq("user_id", userId)
    .eq("month", firstOfMonthKey(year, month))
    .maybeSingle();
  if (!data) return null;

  const goals = data.goals as Partial<MonthlyPlanGoals> | null;
  return {
    goals: {
      mission: goals?.mission ?? "",
      pillars: goals?.pillars ?? [],
      mainGoals: goals?.mainGoals ?? [],
      review: goals?.review ?? null,
    },
    completedAt: data.completed_at,
    reviewedAt: data.reviewed_at,
  };
}

// Atalho leve pra Home, que só precisa da frase da missão.
export async function getMonthlyPlanMission(userId: string, year: number, month: number): Promise<string> {
  const plan = await getMonthlyPlan(userId, year, month);
  return plan?.goals.mission ?? "";
}

export type UpcomingExam = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  daysUntil: number;
};

// Próximas provas cadastradas (calendar_tasks tipo "prova"), da mais
// próxima em diante — alimenta o bloco "Próximas provas" e a contagem
// regressiva na Home.
export async function getUpcomingExams(userId: string, limit = 5): Promise<UpcomingExam[]> {
  const supabase = await createClient();
  const todayKey = toLocalDateKey(new Date());

  const { data } = await supabase
    .from("calendar_tasks")
    .select("id, title, scheduled_date")
    .eq("user_id", userId)
    .eq("type", "prova")
    .gte("scheduled_date", todayKey)
    .order("scheduled_date", { ascending: true })
    .limit(limit);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (data ?? []).map((t) => {
    const examDate = new Date(`${t.scheduled_date}T00:00:00`);
    const daysUntil = Math.round((examDate.getTime() - today.getTime()) / 86_400_000);
    return { id: t.id, title: t.title, date: t.scheduled_date, daysUntil };
  });
}
