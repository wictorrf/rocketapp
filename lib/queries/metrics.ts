import { createClient } from "@/lib/supabase/server";
import { deriveStageLabel } from "@/lib/srs/sm2";
import { toLocalDateKey } from "@/lib/utils/format";

export type MetricsPeriod = "week" | "month" | "all";

export type DayBar = { label: string; value: number; date: string };
export type StageDistribution = { novo: number; aprendendo: number; consolidado: number };
export type SubjectRanking = { subjectId: string; subjectName: string; accuracyPct: number };
export type PieSlice = { label: string; minutes: number; pct: number; color: string };

export type MetricsData = {
  flashcardsReviewed: number;
  retentionPct: number | null;
  dueTodayCount: number;
  reviewsByDay: DayBar[];
  stageDistribution: StageDistribution;
  studiedMinutesByDay: DayBar[];
  weakestSubjects: SubjectRanking[];
  questionsSummary: { done: number; correct: number; accuracyPct: number | null };
  timeBySubject: PieSlice[];
  timeByActivity: PieSlice[];
};

const WEEKDAY_LETTERS_PT = ["D", "S", "T", "Q", "Q", "S", "S"]; // getDay(): 0=dom..6=sáb

function periodStart(period: MetricsPeriod): Date | null {
  if (period === "all") return null;
  const start = new Date();
  start.setDate(start.getDate() - (period === "week" ? 7 : 30));
  return start;
}

function lastNDays(n: number): { date: string; label: string }[] {
  const days: { date: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ date: toLocalDateKey(d), label: WEEKDAY_LETTERS_PT[d.getDay()] });
  }
  return days;
}

const PIE_COLORS = [
  "var(--wine)",
  "var(--pink)",
  "var(--amber)",
  "var(--green)",
  "var(--wine-deep)",
  "var(--coal)",
];

function toPieSlices(minutesByLabel: Map<string, number>): PieSlice[] {
  const total = [...minutesByLabel.values()].reduce((a, b) => a + b, 0);
  return [...minutesByLabel.entries()]
    .filter(([, minutes]) => minutes > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, minutes], i) => ({
      label,
      minutes,
      pct: total ? Math.round((minutes / total) * 100) : 0,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

export async function getMetrics(userId: string, period: MetricsPeriod): Promise<MetricsData> {
  const supabase = await createClient();
  const start = periodStart(period);
  const startIso = start?.toISOString();
  const todayKey = toLocalDateKey(new Date());

  const [
    { data: logs },
    { data: srsStates },
    { data: focusSessions },
    { data: reviewSessions },
    { data: questionLogs },
    { data: dueCount },
    { data: subjects },
    { data: topics },
  ] = await Promise.all([
    (() => {
      let q = supabase.from("review_logs").select("flashcard_id, grade, reviewed_at").eq("user_id", userId);
      if (startIso) q = q.gte("reviewed_at", startIso);
      return q;
    })(),
    supabase.from("flashcard_srs_state").select("repetitions, interval_days").eq("user_id", userId),
    (() => {
      let q = supabase
        .from("focus_sessions")
        .select("subject_id, actual_minutes, started_at")
        .eq("user_id", userId)
        .not("ended_at", "is", null);
      if (startIso) q = q.gte("started_at", startIso);
      return q;
    })(),
    (() => {
      let q = supabase
        .from("review_sessions")
        .select("started_at, ended_at")
        .eq("user_id", userId)
        .not("ended_at", "is", null);
      if (startIso) q = q.gte("started_at", startIso);
      return q;
    })(),
    (() => {
      let q = supabase
        .from("question_logs")
        .select("questions_done, questions_correct, logged_at")
        .eq("user_id", userId);
      if (startIso) q = q.gte("logged_at", startIso);
      return q;
    })(),
    supabase.from("flashcard_srs_state").select("flashcard_id").eq("user_id", userId).lte("due_at", todayKey),
    supabase.from("subjects").select("id, name").eq("user_id", userId),
    supabase.from("topics").select("id, subject_id").eq("user_id", userId),
  ]);

  // ---- flashcards revisados / retenção ----
  const flashcardsReviewed = logs?.length ?? 0;
  const remembered = (logs ?? []).filter((l) => l.grade > 0).length;
  const retentionPct = flashcardsReviewed ? Math.round((remembered / flashcardsReviewed) * 100) : null;

  // ---- estágio dos cartões (snapshot atual, não filtrado por período) ----
  const stageDistribution: StageDistribution = { novo: 0, aprendendo: 0, consolidado: 0 };
  for (const s of srsStates ?? []) {
    stageDistribution[deriveStageLabel({ repetitions: s.repetitions, intervalDays: s.interval_days })] += 1;
  }

  // ---- flashcards revisados por dia (últimos 7 dias, sempre) ----
  const days7 = lastNDays(7);
  const reviewsPerDay = new Map(days7.map((d) => [d.date, 0]));
  for (const l of logs ?? []) {
    const key = toLocalDateKey(new Date(l.reviewed_at));
    if (reviewsPerDay.has(key)) reviewsPerDay.set(key, (reviewsPerDay.get(key) ?? 0) + 1);
  }
  const reviewsByDay: DayBar[] = days7.map((d) => ({
    label: d.label,
    date: d.date,
    value: reviewsPerDay.get(d.date) ?? 0,
  }));

  // ---- horas líquidas de estudo por dia (últimos 7 dias, sempre) ----
  const minutesPerDay = new Map(days7.map((d) => [d.date, 0]));
  for (const f of focusSessions ?? []) {
    const key = toLocalDateKey(new Date(f.started_at));
    if (minutesPerDay.has(key)) minutesPerDay.set(key, (minutesPerDay.get(key) ?? 0) + (f.actual_minutes ?? 0));
  }
  const studiedMinutesByDay: DayBar[] = days7.map((d) => ({
    label: d.label,
    date: d.date,
    value: minutesPerDay.get(d.date) ?? 0,
  }));

  // ---- assuntos/disciplinas fracas (ranking) ----
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const subjectByTopic = new Map((topics ?? []).map((t) => [t.id, t.subject_id]));

  const flashcardIds = [...new Set((logs ?? []).map((l) => l.flashcard_id))];
  const { data: flashcardsForLogs } = flashcardIds.length
    ? await supabase.from("flashcards").select("id, topic_id").in("id", flashcardIds)
    : { data: [] as { id: string; topic_id: string }[] };
  const topicByFlashcard = new Map((flashcardsForLogs ?? []).map((f) => [f.id, f.topic_id]));

  const subjectStats = new Map<string, { remembered: number; total: number }>();
  for (const l of logs ?? []) {
    const topicId = topicByFlashcard.get(l.flashcard_id);
    const subjectId = topicId ? subjectByTopic.get(topicId) : null;
    if (!subjectId) continue;
    const stat = subjectStats.get(subjectId) ?? { remembered: 0, total: 0 };
    stat.total += 1;
    if (l.grade > 0) stat.remembered += 1;
    subjectStats.set(subjectId, stat);
  }
  const weakestSubjects: SubjectRanking[] = [...subjectStats.entries()]
    .map(([subjectId, stat]) => ({
      subjectId,
      subjectName: subjectNameById.get(subjectId) ?? "",
      accuracyPct: Math.round((stat.remembered / stat.total) * 100),
    }))
    .sort((a, b) => a.accuracyPct - b.accuracyPct)
    .slice(0, 5);

  // ---- questões e simulados ----
  const questionsDone = (questionLogs ?? []).reduce((sum, q) => sum + q.questions_done, 0);
  const questionsCorrect = (questionLogs ?? []).reduce((sum, q) => sum + q.questions_correct, 0);

  // ---- pizza: tempo por matéria ----
  const minutesBySubject = new Map<string, number>();
  for (const f of focusSessions ?? []) {
    if (!f.subject_id) continue;
    const name = subjectNameById.get(f.subject_id) ?? "Outra";
    minutesBySubject.set(name, (minutesBySubject.get(name) ?? 0) + (f.actual_minutes ?? 0));
  }
  const timeBySubject = toPieSlices(minutesBySubject);

  // ---- pizza: tempo por tipo de atividade ----
  const focusTotalMinutes = (focusSessions ?? []).reduce((sum, f) => sum + (f.actual_minutes ?? 0), 0);
  const reviewTotalMinutes = (reviewSessions ?? []).reduce((sum, r) => {
    const ms = new Date(r.ended_at!).getTime() - new Date(r.started_at).getTime();
    return sum + Math.max(0, Math.round(ms / 60_000));
  }, 0);
  const timeByActivity = toPieSlices(
    new Map([
      ["Modo Foco", focusTotalMinutes],
      ["Revisão de flashcards", reviewTotalMinutes],
    ]),
  );

  return {
    flashcardsReviewed,
    retentionPct,
    dueTodayCount: dueCount?.length ?? 0,
    reviewsByDay,
    stageDistribution,
    studiedMinutesByDay,
    weakestSubjects,
    questionsSummary: {
      done: questionsDone,
      correct: questionsCorrect,
      accuracyPct: questionsDone ? Math.round((questionsCorrect / questionsDone) * 100) : null,
    },
    timeBySubject,
    timeByActivity,
  };
}
