import { createClient } from "@/lib/supabase/server";
import { State, deriveStageLabel, isConsolidated, type StageLabel } from "@/lib/srs/fsrs";
import { toLocalDateKey, dateKeyToUtcDate, addDaysToKey } from "@/lib/utils/format";
import { startOfDayInTimeZone } from "@/lib/utils/timezone";
import { activityTypeLabel, ACTIVITY_TYPES } from "@/lib/timer/pomodoro";
import { QUESTION_LOG_TYPE_LABEL, type QuestionLogType } from "@/lib/constants/question-log-types";
import {
  type MetricsPeriod,
  type PeriodRange,
  type Comparison,
  isRemembered,
  weightedAccuracyPct,
  firstReviewPerCardPerDay,
  compareToPrevious,
  evolutionBucketKey,
  granularityFor,
} from "@/lib/metrics/calc";

export type { MetricsPeriod } from "@/lib/metrics/calc";
export { PERIOD_LABEL, FIRST_YEAR, resolvePeriodRange } from "@/lib/metrics/calc";

export type MetricsFilters = {
  subjectId: string | null;
  topicId: string | null;
  activityType: string | null;
};

const EMPTY_FILTERS: MetricsFilters = { subjectId: null, topicId: null, activityType: null };

export type DayBar = { key: string; label: string; value: number };

// "Todo o período" (start === null) nunca deve levar limite superior junto —
// `range.end` nesse caso é só um sentinela de data extrema (usado pelos
// loops de bucket, que já ignoram o range quando start é nulo) pra não
// precisar de um terceiro tipo; um sentinela de ano ~275760 chegou a causar
// filtro vazio no PostgREST/Postgres quando enviado como limite real.
function isoRangeOf(start: Date | null, end: Date | null) {
  if (!start) return { startIso: null, endIso: null };
  return { startIso: start.toISOString(), endIso: end ? end.toISOString() : null };
}

const MONTH_SHORT_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function bucketLabel(key: string, granularity: "day" | "month"): string {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return `${MONTH_SHORT_PT[Number(m) - 1]}/${y.slice(2)}`;
  }
  const d = new Date(`${key}T00:00:00`);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Monta a série com todos os baldes do período já zerados (pra dia sem
// revisão/questão/estudo aparecer como zero verdadeiro, não como ausência),
// depois soma cada ocorrência no balde certo. Sem início definido (Todo o
// período), os baldes nascem só a partir dos dados encontrados.
function bucketDates(dates: string[], range: PeriodRange, granularity: "day" | "month"): DayBar[] {
  const map = new Map<string, number>();
  if (range.start) {
    const cursor = new Date(range.start);
    if (granularity === "month") cursor.setDate(1);
    while (cursor < range.end) {
      map.set(evolutionBucketKey(cursor.toISOString(), granularity), 0);
      if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }
  }
  for (const iso of dates) {
    const key = evolutionBucketKey(iso, granularity);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, value]) => ({ key, label: bucketLabel(key, granularity), value }));
}

function bucketMinutes(rows: { started_at: string; minutes: number }[], range: PeriodRange, granularity: "day" | "month"): DayBar[] {
  const map = new Map<string, number>();
  if (range.start) {
    const cursor = new Date(range.start);
    if (granularity === "month") cursor.setDate(1);
    while (cursor < range.end) {
      map.set(evolutionBucketKey(cursor.toISOString(), granularity), 0);
      if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }
  }
  for (const r of rows) {
    const key = evolutionBucketKey(r.started_at, granularity);
    map.set(key, (map.get(key) ?? 0) + r.minutes);
  }
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, value]) => ({ key, label: bucketLabel(key, granularity), value }));
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
export type StageDistribution = Record<StageLabel, number>;

export type FlashcardMetrics = {
  reviewedCount: number;
  reviewedComparison: Comparison;
  retentionPct: number | null;
  retentionComparison: Comparison;
  retentionSampleCount: number;
  overdueCount: number;
  dueTodayCount: number;
  consolidatedCount: number;
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

  const stageDistribution: StageDistribution = { novo: 0, aprendendo: 0, revisao: 0, reaprendizagem: 0, suspenso: 0 };
  let consolidatedCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  const todayKey = toLocalDateKey(new Date(), timeZone);
  const startOfToday = startOfDayInTimeZone(todayKey, timeZone);
  const endOfToday = new Date(startOfDayInTimeZone(addDaysToKey(todayKey, 1), timeZone).getTime() - 1);

  for (const row of filteredStates) {
    const suspended = Boolean(row.suspended_at);
    const stage = deriveStageLabel(row.state as State, suspended);
    stageDistribution[stage] += 1;
    if (isConsolidated(row.state as State, row.stability, suspended)) consolidatedCount += 1;
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
    consolidatedCount,
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
  evolution: DayBar[];
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
  const evolution = bucketDates(current.map((r) => r.logged_at), range, granularity);

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
export type PieSlice = { key: string; label: string; minutes: number; pct: number; color: string; sessionsCount: number };

export type StudyTimeMetrics = {
  netMinutes: number;
  netMinutesComparison: Comparison;
  sessionsCount: number;
  evolution: DayBar[];
  bySubject: PieSlice[];
  byActivity: PieSlice[];
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

  const granularity = granularityFor(period);
  const evolution = bucketMinutes(
    currentRows.map((r) => ({ started_at: r.started_at, minutes: r.actual_minutes ?? 0 })),
    range,
    granularity,
  );

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
  const bySubject: PieSlice[] = [...bySubjectMap.entries()]
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
  const byActivity: PieSlice[] = [...byActivityMap.entries()]
    .sort(([, a], [, b]) => b.minutes - a.minutes)
    .map(([key, v], i) => {
      const [base, custom] = key.split(":");
      return {
        key,
        label: custom ?? activityTypeLabel(base, null),
        minutes: v.minutes,
        pct: byActivityTotal ? Math.round((v.minutes / byActivityTotal) * 100) : 0,
        color: PIE_PALETTE[(ACTIVITY_TYPES.findIndex((a) => a.value === base) + i) % PIE_PALETTE.length] ?? PIE_PALETTE[i % PIE_PALETTE.length],
        sessionsCount: v.sessions,
      };
    });

  return {
    netMinutes,
    netMinutesComparison: previousRows ? compareToPrevious(netMinutes, prevNetMinutes) : null,
    sessionsCount: currentRows.length,
    evolution,
    bySubject,
    byActivity,
  };
}

// ---------- Onde focar ----------
export type FocusSuggestion = {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  reason: string;
};

// Amostras mínimas pra cada sinal — decisão de produto (documentada aqui,
// conforme o requisito pede) pra evitar recomendações baseadas em pouquíssimos
// registros.
const MIN_QUESTIONS_SAMPLE = 5;
const MIN_RETENTION_SAMPLE = 5;
const MIN_OVERDUE_SAMPLE = 3;
const MIN_ACTIVE_CARDS_FOR_DIFFICULTY = 5;
const LOW_ACCURACY_THRESHOLD = 70;
const LOW_RETENTION_THRESHOLD = 75;
const HIGH_DIFFICULTY_THRESHOLD = 6.5;
const EXAM_SOON_DAYS = 14;
const LOW_STUDY_MINUTES_BEFORE_EXAM = 60;

export async function getFocusSuggestions(
  userId: string,
  range: PeriodRange,
  timeZone: string,
  filters: MetricsFilters = EMPTY_FILTERS,
): Promise<FocusSuggestion[]> {
  const supabase = await createClient();
  const { startIso, endIso } = isoRangeOf(range.start, range.end);

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id, subjects!inner(name, user_id, archived_at)")
    .eq("subjects.user_id", userId)
    .is("subjects.archived_at", null)
    .is("archived_at", null);
  const topicRows = (topics ?? []).filter((t) => {
    if (filters.topicId) return t.id === filters.topicId;
    if (filters.subjectId) return t.subject_id === filters.subjectId;
    return true;
  });
  if (topicRows.length === 0) return [];
  const topicIds = topicRows.map((t) => t.id);
  const topicNameById = new Map(topicRows.map((t) => [t.id, t.name]));
  const subjectOf = new Map(
    topicRows.map((t) => [t.id, { id: t.subject_id, name: (Array.isArray(t.subjects) ? t.subjects[0] : t.subjects)?.name ?? "" }]),
  );

  const todayKey = toLocalDateKey(new Date(), timeZone);

  const [{ data: qLogs }, { data: flashcards }, { data: examTasks }] = await Promise.all([
    (() => {
      let q = supabase.from("question_logs").select("topic_id, questions_done, questions_correct, logged_at").eq("user_id", userId).in("topic_id", topicIds);
      if (startIso) q = q.gte("logged_at", startIso);
      if (endIso) q = q.lt("logged_at", endIso);
      return q;
    })(),
    supabase.from("flashcards").select("id, topic_id").eq("user_id", userId).in("topic_id", topicIds),
    supabase
      .from("calendar_tasks")
      .select("topic_id, subject_id, scheduled_date")
      .eq("user_id", userId)
      .eq("type", "prova")
      .eq("status", "pending")
      .gte("scheduled_date", todayKey),
  ]);

  const flashcardIds = (flashcards ?? []).map((f) => f.id);
  const topicByFlashcard = new Map((flashcards ?? []).map((f) => [f.id, f.topic_id]));

  const { data: reviewLogs } = flashcardIds.length
    ? await (async () => {
        let q = supabase.from("review_logs").select("flashcard_id, rating, reviewed_at").eq("user_id", userId).in("flashcard_id", flashcardIds);
        if (startIso) q = q.gte("reviewed_at", startIso);
        if (endIso) q = q.lt("reviewed_at", endIso);
        return q;
      })()
    : { data: [] };

  const { data: srsStates } = flashcardIds.length
    ? await supabase.from("flashcard_srs_state").select("flashcard_id, due_at, difficulty, suspended_at").in("flashcard_id", flashcardIds)
    : { data: [] };

  const examDaysByTopic = new Map<string, number>();
  for (const exam of examTasks ?? []) {
    const tId = exam.topic_id;
    if (!tId || !topicIds.includes(tId)) continue;
    const days = Math.round((dateKeyToUtcDate(exam.scheduled_date).getTime() - dateKeyToUtcDate(todayKey).getTime()) / 86_400_000);
    if (days <= EXAM_SOON_DAYS && (!examDaysByTopic.has(tId) || days < examDaysByTopic.get(tId)!)) examDaysByTopic.set(tId, days);
  }

  const { data: studyRows } = await (async () => {
    let q = supabase.from("focus_sessions").select("topic_id, actual_minutes").eq("user_id", userId).not("ended_at", "is", null).in("topic_id", topicIds);
    if (startIso) q = q.gte("started_at", startIso);
    if (endIso) q = q.lt("started_at", endIso);
    return q;
  })();
  const studyMinutesByTopic = new Map<string, number>();
  for (const r of studyRows ?? []) {
    if (!r.topic_id) continue;
    studyMinutesByTopic.set(r.topic_id, (studyMinutesByTopic.get(r.topic_id) ?? 0) + (r.actual_minutes ?? 0));
  }

  const suggestions: FocusSuggestion[] = [];
  for (const topicId of topicIds) {
    const reasons: string[] = [];

    const qForTopic = (qLogs ?? []).filter((l) => l.topic_id === topicId);
    const qDone = qForTopic.reduce((s, l) => s + l.questions_done, 0);
    const qCorrect = qForTopic.reduce((s, l) => s + l.questions_correct, 0);
    if (qDone >= MIN_QUESTIONS_SAMPLE) {
      const pct = weightedAccuracyPct(qCorrect, qDone)!;
      if (pct < LOW_ACCURACY_THRESHOLD) reasons.push(`sua porcentagem de acertos foi de ${pct}% em ${qDone} questões`);
    }

    const reviewsForTopic = (reviewLogs ?? []).filter((r) => topicByFlashcard.get(r.flashcard_id) === topicId);
    const dedup = firstReviewPerCardPerDay(reviewsForTopic, (r) => r.flashcard_id, (r) => r.reviewed_at);
    if (dedup.length >= MIN_RETENTION_SAMPLE) {
      const remembered = dedup.filter((r) => isRemembered(r.rating)).length;
      const pct = weightedAccuracyPct(remembered, dedup.length)!;
      if (pct < LOW_RETENTION_THRESHOLD) reasons.push(`sua retenção observada foi de ${pct}%`);
    }

    const statesForTopic = (srsStates ?? []).filter((s) => topicByFlashcard.get(s.flashcard_id) === topicId && !s.suspended_at);
    const overdue = statesForTopic.filter((s) => new Date(s.due_at) < new Date()).length;
    if (overdue >= MIN_OVERDUE_SAMPLE) reasons.push(`existem ${overdue} flashcards atrasados`);

    if (statesForTopic.length >= MIN_ACTIVE_CARDS_FOR_DIFFICULTY) {
      const avgDifficulty = statesForTopic.reduce((s, r) => s + r.difficulty, 0) / statesForTopic.length;
      if (avgDifficulty >= HIGH_DIFFICULTY_THRESHOLD) reasons.push("seus flashcards têm dificuldade recorrente");
    }

    if (examDaysByTopic.has(topicId)) {
      const days = examDaysByTopic.get(topicId)!;
      const minutes = studyMinutesByTopic.get(topicId) ?? 0;
      if (minutes < LOW_STUDY_MINUTES_BEFORE_EXAM) {
        reasons.push(`há uma prova em ${days <= 0 ? "breve" : `${days} dias`} e pouco tempo dedicado até agora`);
      }
    }

    if (reasons.length === 0) continue;
    const subject = subjectOf.get(topicId);
    if (!subject) continue;
    const topicName = topicNameById.get(topicId) ?? "";
    const reasonText = reasons.length === 1 ? reasons[0] : `${reasons.slice(0, -1).join(", ")} e ${reasons[reasons.length - 1]}`;
    suggestions.push({
      topicId,
      topicName,
      subjectId: subject.id,
      subjectName: subject.name,
      reason: `${topicName} merece atenção porque ${reasonText}.`,
    });
  }

  return suggestions.sort((a, b) => b.reason.length - a.reason.length).slice(0, 6);
}

// ---------- Registros de questões, pro filtro "tipo de registro" ----------
export const QUESTION_LOG_TYPE_OPTIONS: { value: QuestionLogType; label: string }[] = Object.entries(
  QUESTION_LOG_TYPE_LABEL,
).map(([value, label]) => ({ value: value as QuestionLogType, label }));

