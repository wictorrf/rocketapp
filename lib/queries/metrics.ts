import { createClient } from "@/lib/supabase/server";
import { State, deriveStageBreakdownLabel, type StageBreakdownLabel } from "@/lib/srs/fsrs";
import { toLocalDateKey, addDaysToKey } from "@/lib/utils/format";
import { startOfDayInTimeZone } from "@/lib/utils/timezone";
import { activityTypeLabel, ACTIVITY_TYPES } from "@/lib/timer/pomodoro";
import { QUESTION_LOG_TYPE_LABEL, type QuestionLogType } from "@/lib/constants/question-log-types";
import {
  type MetricsPeriod,
  type PeriodRange,
  type Comparison,
  type DayBar,
  isRemembered,
  weightedAccuracyPct,
  firstReviewPerCardPerDay,
  compareToPrevious,
  evolutionBucketKey,
  granularityFor,
  bucketDates,
  bucketLabel,
} from "@/lib/metrics/calc";

export type { MetricsPeriod } from "@/lib/metrics/calc";
export type { DayBar } from "@/lib/metrics/calc";
export { PERIOD_LABEL, FIRST_YEAR, resolvePeriodRange } from "@/lib/metrics/calc";

export type MetricsFilters = {
  subjectId: string | null;
  topicId: string | null;
  activityType: string | null;
};

const EMPTY_FILTERS: MetricsFilters = { subjectId: null, topicId: null, activityType: null };

// "Todo o período" (start === null) nunca deve levar limite superior junto —
// `range.end` nesse caso é só um sentinela de data extrema (usado pelos
// loops de bucket, que já ignoram o range quando start é nulo) pra não
// precisar de um terceiro tipo; um sentinela de ano ~275760 chegou a causar
// filtro vazio no PostgREST/Postgres quando enviado como limite real.
function isoRangeOf(start: Date | null, end: Date | null) {
  if (!start) return { startIso: null, endIso: null };
  return { startIso: start.toISOString(), endIso: end ? end.toISOString() : null };
}

export type QuestionEvolutionPoint = { key: string; label: string; done: number; accuracyPct: number | null };

// Igual ao zero-fill de bucketDates, mas soma questions_done/questions_correct
// por balde e já deriva o aproveitamento do balde (não dá pra tirar isso de
// bucketDates, que só conta ocorrências) — alimenta o gráfico combinado
// barra (quantidade) + linha (% de acertos) das Métricas.
function bucketQuestions(
  rows: { questions_done: number; questions_correct: number; logged_at: string }[],
  range: PeriodRange,
  granularity: "day" | "month",
): QuestionEvolutionPoint[] {
  const map = new Map<string, { done: number; correct: number }>();
  if (range.start) {
    const cursor = new Date(range.start);
    if (granularity === "month") cursor.setDate(1);
    while (cursor < range.end) {
      map.set(evolutionBucketKey(cursor.toISOString(), granularity), { done: 0, correct: 0 });
      if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }
  }
  for (const r of rows) {
    const key = evolutionBucketKey(r.logged_at, granularity);
    const cur = map.get(key) ?? { done: 0, correct: 0 };
    cur.done += r.questions_done;
    cur.correct += r.questions_correct;
    map.set(key, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => ({ key, label: bucketLabel(key, granularity), done: v.done, accuracyPct: weightedAccuracyPct(v.correct, v.done) }));
}

// ---------- Disciplinas/assuntos ativos, pros seletores de filtro ----------
export type MetricsSubjectOption = { subjectId: string; subjectName: string; topics: { topicId: string; topicName: string }[] };

export async function getMetricsFilterOptions(userId: string): Promise<MetricsSubjectOption[]> {
  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("name");
  if (!subjects?.length) return [];
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in(
      "subject_id",
      subjects.map((s) => s.id),
    )
    .is("archived_at", null)
    .order("name");

  return subjects.map((s) => ({
    subjectId: s.id,
    subjectName: s.name,
    topics: (topics ?? []).filter((t) => t.subject_id === s.id).map((t) => ({ topicId: t.id, topicName: t.name })),
  }));
}

// ---------- Flashcards ----------
export type StageDistribution = Record<StageBreakdownLabel, number>;

export type FlashcardMetrics = {
  reviewedCount: number;
  reviewedComparison: Comparison;
  retentionPct: number | null;
  retentionComparison: Comparison;
  retentionSampleCount: number;
  overdueCount: number;
  dueTodayCount: number;
  stageDistribution: StageDistribution;
  reviewsByDay: DayBar[];
};

async function topicIdsForFilter(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: MetricsFilters,
): Promise<string[] | null> {
  if (filters.topicId) return [filters.topicId];
  if (filters.subjectId) {
    const { data } = await supabase.from("topics").select("id").eq("subject_id", filters.subjectId);
    return (data ?? []).map((t) => t.id);
  }
  return null;
}

async function reviewLogsInRange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  startIso: string | null,
  endIso: string | null,
  filters: MetricsFilters,
): Promise<{ flashcard_id: string; rating: number; reviewed_at: string }[]> {
  const topicIds = await topicIdsForFilter(supabase, filters);
  let flashcardIds: string[] | null = null;
  if (topicIds) {
    if (topicIds.length === 0) return [];
    const { data } = await supabase.from("flashcards").select("id").eq("user_id", userId).in("topic_id", topicIds);
    flashcardIds = (data ?? []).map((f) => f.id);
    if (flashcardIds.length === 0) return [];
  }

  let q = supabase.from("review_logs").select("flashcard_id, rating, reviewed_at").eq("user_id", userId);
  if (startIso) q = q.gte("reviewed_at", startIso);
  if (endIso) q = q.lt("reviewed_at", endIso);
  if (flashcardIds) q = q.in("flashcard_id", flashcardIds);
  const { data } = await q;
  return data ?? [];
}

export async function getFlashcardMetrics(
  userId: string,
  period: MetricsPeriod,
  range: PeriodRange,
  timeZone: string,
  filters: MetricsFilters = EMPTY_FILTERS,
): Promise<FlashcardMetrics> {
  const supabase = await createClient();
  const { startIso, endIso } = isoRangeOf(range.start, range.end);

  const [currentLogs, previousLogs] = await Promise.all([
    reviewLogsInRange(supabase, userId, startIso, endIso, filters),
    range.previous ? reviewLogsInRange(supabase, userId, isoRangeOf(range.previous.start, range.previous.end).startIso, isoRangeOf(range.previous.start, range.previous.end).endIso, filters) : null,
  ]);

  const currentDedup = firstReviewPerCardPerDay(currentLogs, (r) => r.flashcard_id, (r) => r.reviewed_at);
  const currentRemembered = currentDedup.filter((r) => isRemembered(r.rating)).length;
  const retentionPct = currentDedup.length > 0 ? weightedAccuracyPct(currentRemembered, currentDedup.length) : null;

  let prevRetentionPct: number | null = null;
  if (previousLogs) {
    const prevDedup = firstReviewPerCardPerDay(previousLogs, (r) => r.flashcard_id, (r) => r.reviewed_at);
    prevRetentionPct = prevDedup.length > 0 ? weightedAccuracyPct(prevDedup.filter((r) => isRemembered(r.rating)).length, prevDedup.length) : null;
  }

  // Estado atual dos cartões (não depende do período — é sempre "agora"), respeitando os filtros.
  const { data: stateRows } = await supabase
    .from("flashcard_srs_state")
    .select("state, stability, suspended_at, due_at, flashcard_id, flashcards!inner(topic_id, user_id, topics(subject_id))")
    .eq("user_id", userId);

  const filteredStates = (stateRows ?? []).filter((row) => {
    const fc = Array.isArray(row.flashcards) ? row.flashcards[0] : row.flashcards;
    if (!fc) return false;
    if (filters.topicId) return fc.topic_id === filters.topicId;
    if (filters.subjectId) {
      const topic = Array.isArray(fc.topics) ? fc.topics[0] : fc.topics;
      return topic?.subject_id === filters.subjectId;
    }
    return true;
  });

  const stageDistribution: StageDistribution = { novo: 0, aprendendo: 0, revisao: 0, reaprendizagem: 0, consolidado: 0 };
  let overdueCount = 0;
  let dueTodayCount = 0;
  const todayKey = toLocalDateKey(new Date(), timeZone);
  const startOfToday = startOfDayInTimeZone(todayKey, timeZone);
  const endOfToday = new Date(startOfDayInTimeZone(addDaysToKey(todayKey, 1), timeZone).getTime() - 1);

  for (const row of filteredStates) {
    const suspended = Boolean(row.suspended_at);
    const stage = deriveStageBreakdownLabel(row.state as State, row.stability, suspended);
    stageDistribution[stage] += 1;
    if (!suspended) {
      const dueAt = new Date(row.due_at);
      if (dueAt < startOfToday) overdueCount += 1;
      else if (dueAt <= endOfToday) dueTodayCount += 1;
    }
  }

  const granularity = granularityFor(period);
  const reviewsByDay = bucketDates(currentLogs.map((r) => r.reviewed_at), range, granularity);

  return {
    reviewedCount: currentLogs.length,
    reviewedComparison: previousLogs ? compareToPrevious(currentLogs.length, previousLogs.length) : null,
    retentionPct,
    retentionComparison: previousLogs ? compareToPrevious(retentionPct ?? 0, prevRetentionPct) : null,
    retentionSampleCount: currentDedup.length,
    overdueCount,
    dueTodayCount: overdueCount + dueTodayCount,
    stageDistribution,
    reviewsByDay,
  };
}

// ---------- Questões registradas ----------
export type QuestionMetrics = {
  respondedCount: number;
  respondedComparison: Comparison;
  correctCount: number;
  accuracyPct: number | null;
  accuracyComparison: Comparison;
  evolution: QuestionEvolutionPoint[];
};

async function questionLogsInRange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  startIso: string | null,
  endIso: string | null,
  filters: MetricsFilters,
): Promise<{ questions_done: number; questions_correct: number; logged_at: string }[]> {
  let q = supabase.from("question_logs").select("questions_done, questions_correct, logged_at, topic_id").eq("user_id", userId);
  if (startIso) q = q.gte("logged_at", startIso);
  if (endIso) q = q.lt("logged_at", endIso);
  if (filters.topicId) q = q.eq("topic_id", filters.topicId);
  const { data } = await q;
  let rows = data ?? [];
  if (!filters.topicId && filters.subjectId) {
    const { data: topics } = await supabase.from("topics").select("id").eq("subject_id", filters.subjectId);
    const topicIds = new Set((topics ?? []).map((t) => t.id));
    rows = rows.filter((r) => topicIds.has(r.topic_id));
  }
  return rows;
}

export async function getQuestionMetrics(
  userId: string,
  period: MetricsPeriod,
  range: PeriodRange,
  filters: MetricsFilters = EMPTY_FILTERS,
): Promise<QuestionMetrics> {
  const supabase = await createClient();
  const { startIso, endIso } = isoRangeOf(range.start, range.end);
  const [current, previous] = await Promise.all([
    questionLogsInRange(supabase, userId, startIso, endIso, filters),
    range.previous ? questionLogsInRange(supabase, userId, isoRangeOf(range.previous.start, range.previous.end).startIso, isoRangeOf(range.previous.start, range.previous.end).endIso, filters) : null,
  ]);

  const done = current.reduce((s, r) => s + r.questions_done, 0);
  const correct = current.reduce((s, r) => s + r.questions_correct, 0);
  const accuracyPct = weightedAccuracyPct(correct, done);

  let prevAccuracyPct: number | null = null;
  let prevDone: number | null = null;
  if (previous) {
    prevDone = previous.reduce((s, r) => s + r.questions_done, 0);
    prevAccuracyPct = weightedAccuracyPct(previous.reduce((s, r) => s + r.questions_correct, 0), prevDone);
  }

  const granularity = granularityFor(period);
  const evolution = bucketQuestions(current, range, granularity);

  return {
    respondedCount: done,
    respondedComparison: previous ? compareToPrevious(done, prevDone) : null,
    correctCount: correct,
    accuracyPct,
    accuracyComparison: previous ? compareToPrevious(accuracyPct ?? 0, prevAccuracyPct) : null,
    evolution,
  };
}

// ---------- Tempo de estudo ----------
export type TimeSlice = { key: string; label: string; minutes: number; pct: number; color: string; sessionsCount: number };

export type StudyTimeMetrics = {
  netMinutes: number;
  netMinutesComparison: Comparison;
  sessionsCount: number;
  bySubject: TimeSlice[];
  byActivity: TimeSlice[];
};

type FocusRow = {
  subject_id: string | null;
  topic_id: string | null;
  activity_type: string;
  activity_type_custom: string | null;
  actual_minutes: number | null;
  started_at: string;
};

async function fetchFinishedSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  startIso: string | null,
  endIso: string | null,
  filters: MetricsFilters,
): Promise<FocusRow[]> {
  let q = supabase
    .from("focus_sessions")
    .select("subject_id, topic_id, activity_type, activity_type_custom, actual_minutes, started_at")
    .eq("user_id", userId)
    .not("ended_at", "is", null);
  if (startIso) q = q.gte("started_at", startIso);
  if (endIso) q = q.lt("started_at", endIso);
  if (filters.topicId) q = q.eq("topic_id", filters.topicId);
  else if (filters.subjectId) q = q.eq("subject_id", filters.subjectId);
  if (filters.activityType) q = q.eq("activity_type", filters.activityType);
  const { data } = await q;
  return data ?? [];
}

const PIE_PALETTE = ["#68162E", "#E1648C", "#D8952C", "#4D9A68", "#4C86C6", "#8659A6", "#E17B5D", "#98A2B3"];

// Cor fixa por tipo de atividade (exceto "outro", cujos rótulos são livres e
// entram um a um na paleta por índice) — sem isso, a cor de "Revisão" mudava
// de um período pro outro conforme quais tipos apareciam nos dados.
const ACTIVITY_COLOR: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPES.filter((a) => a.value !== "outro").map((a, i) => [a.value, PIE_PALETTE[i % PIE_PALETTE.length]]),
);

export async function getStudyTimeMetrics(
  userId: string,
  period: MetricsPeriod,
  range: PeriodRange,
  filters: MetricsFilters = EMPTY_FILTERS,
): Promise<StudyTimeMetrics> {
  const supabase = await createClient();
  const { startIso, endIso } = isoRangeOf(range.start, range.end);
  const [currentRows, previousRows] = await Promise.all([
    fetchFinishedSessions(supabase, userId, startIso, endIso, filters),
    range.previous
      ? fetchFinishedSessions(supabase, userId, isoRangeOf(range.previous.start, range.previous.end).startIso, isoRangeOf(range.previous.start, range.previous.end).endIso, filters)
      : null,
  ]);

  const netMinutes = currentRows.reduce((sum, r) => sum + (r.actual_minutes ?? 0), 0);
  const prevNetMinutes = previousRows ? previousRows.reduce((sum, r) => sum + (r.actual_minutes ?? 0), 0) : null;

  // Pizza 1: por disciplina (usa a cor cadastrada da própria disciplina).
  const subjectIds = [...new Set(currentRows.map((r) => r.subject_id).filter((v): v is string => Boolean(v)))];
  const { data: subjectRows } = subjectIds.length
    ? await supabase.from("subjects").select("id, name, color").in("id", subjectIds)
    : { data: [] };
  const subjectById = new Map((subjectRows ?? []).map((s) => [s.id, s]));
  const bySubjectMap = new Map<string, { minutes: number; sessions: number }>();
  for (const r of currentRows) {
    if (!r.subject_id) continue;
    const cur = bySubjectMap.get(r.subject_id) ?? { minutes: 0, sessions: 0 };
    cur.minutes += r.actual_minutes ?? 0;
    cur.sessions += 1;
    bySubjectMap.set(r.subject_id, cur);
  }
  const bySubjectTotal = [...bySubjectMap.values()].reduce((s, v) => s + v.minutes, 0);
  const bySubject: TimeSlice[] = [...bySubjectMap.entries()]
    .sort(([, a], [, b]) => b.minutes - a.minutes)
    .map(([subjectId, v], i) => ({
      key: subjectId,
      label: subjectById.get(subjectId)?.name ?? "Sem disciplina",
      minutes: v.minutes,
      pct: bySubjectTotal ? Math.round((v.minutes / bySubjectTotal) * 100) : 0,
      color: subjectById.get(subjectId)?.color || PIE_PALETTE[i % PIE_PALETTE.length],
      sessionsCount: v.sessions,
    }));

  // Pizza 2: por tipo de atividade real do Study Time (não é o modo do cronômetro).
  const byActivityMap = new Map<string, { minutes: number; sessions: number }>();
  for (const r of currentRows) {
    const key = r.activity_type === "outro" && r.activity_type_custom ? `outro:${r.activity_type_custom}` : r.activity_type;
    const cur = byActivityMap.get(key) ?? { minutes: 0, sessions: 0 };
    cur.minutes += r.actual_minutes ?? 0;
    cur.sessions += 1;
    byActivityMap.set(key, cur);
  }
  const byActivityTotal = [...byActivityMap.values()].reduce((s, v) => s + v.minutes, 0);
  const byActivity: TimeSlice[] = [...byActivityMap.entries()]
    .sort(([, a], [, b]) => b.minutes - a.minutes)
    .map(([key, v], i) => {
      const [base, custom] = key.split(":");
      return {
        key,
        label: custom ?? activityTypeLabel(base, null),
        minutes: v.minutes,
        pct: byActivityTotal ? Math.round((v.minutes / byActivityTotal) * 100) : 0,
        color: ACTIVITY_COLOR[base] ?? PIE_PALETTE[i % PIE_PALETTE.length],
        sessionsCount: v.sessions,
      };
    });

  return {
    netMinutes,
    netMinutesComparison: previousRows ? compareToPrevious(netMinutes, prevNetMinutes) : null,
    sessionsCount: currentRows.length,
    bySubject,
    byActivity,
  };
}

// ---------- Registros de questões, pro filtro "tipo de registro" ----------
export const QUESTION_LOG_TYPE_OPTIONS: { value: QuestionLogType; label: string }[] = Object.entries(
  QUESTION_LOG_TYPE_LABEL,
).map(([value, label]) => ({ value: value as QuestionLogType, label }));

