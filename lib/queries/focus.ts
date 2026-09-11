import { createClient } from "@/lib/supabase/server";
import { activityTypeLabel, type Mode, type Phase } from "@/lib/timer/pomodoro";
import { startOfDayInTimeZone } from "@/lib/utils/timezone";
import { toLocalDateKey } from "@/lib/utils/format";

export type SubjectTopicOption = {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
};

export async function listSubjectTopicOptions(userId: string): Promise<SubjectTopicOption[]> {
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId)
    .is("archived_at", null);
  if (!subjects?.length) return [];
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in(
      "subject_id",
      subjects.map((s) => s.id),
    )
    .is("archived_at", null);

  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
  return (topics ?? []).map((t) => ({
    subjectId: t.subject_id,
    subjectName: subjectNameById.get(t.subject_id) ?? "",
    topicId: t.id,
    topicName: t.name,
  }));
}

export type FocusSessionState = {
  id: string;
  subjectId: string;
  topicId: string;
  subjectName: string;
  topicName: string;
  activityType: string;
  activityTypeCustom: string | null;
  mode: Mode;
  status: "running" | "paused" | "finished";
  phase: Phase;
  cycleIndex: number;
  phaseStartedAt: string;
  phasePlannedSeconds: number;
  phaseRemainingSeconds: number;
  netSeconds: number;
  simuladoMinutes: number;
  startedAt: string;
  questionLogId: string | null;
};

type RawSessionRow = {
  id: string;
  subject_id: string | null;
  topic_id: string | null;
  activity_type: string;
  activity_type_custom: string | null;
  mode: string;
  status: string;
  phase: string;
  cycle_index: number;
  phase_started_at: string;
  phase_planned_seconds: number;
  phase_remaining_seconds: number;
  net_seconds: number;
  planned_minutes: number | null;
  started_at: string;
  question_log_id: string | null;
  subjects: { name: string } | { name: string }[] | null;
  topics: { name: string } | { name: string }[] | null;
};

function rowToState(row: RawSessionRow): FocusSessionState {
  const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
  const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
  return {
    id: row.id,
    subjectId: row.subject_id ?? "",
    topicId: row.topic_id ?? "",
    subjectName: subject?.name ?? "",
    topicName: topic?.name ?? "",
    activityType: row.activity_type,
    activityTypeCustom: row.activity_type_custom,
    mode: row.mode as Mode,
    status: row.status as FocusSessionState["status"],
    phase: row.phase as Phase,
    cycleIndex: row.cycle_index,
    phaseStartedAt: row.phase_started_at,
    phasePlannedSeconds: row.phase_planned_seconds,
    phaseRemainingSeconds: row.phase_remaining_seconds,
    netSeconds: row.net_seconds,
    simuladoMinutes: row.planned_minutes ?? 60,
    startedAt: row.started_at,
    questionLogId: row.question_log_id,
  };
}

const SESSION_SELECT = `
  id, subject_id, topic_id, activity_type, activity_type_custom, mode, status, phase,
  cycle_index, phase_started_at, phase_planned_seconds, phase_remaining_seconds, net_seconds,
  planned_minutes, started_at, question_log_id,
  subjects(name), topics(name)
`;

// A sessão "viva" da usuária (rodando ou pausada) — no máximo uma por vez.
// Base pra sessão sobreviver a recarregar a página, trocar de aba etc: o
// cliente reconstrói o cronômetro a partir desse checkpoint + hora real.
export async function getActiveFocusSession(userId: string): Promise<FocusSessionState | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("focus_sessions")
    .select(SESSION_SELECT)
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return rowToState(data as unknown as RawSessionRow);
}

export async function getFocusSessionById(sessionId: string): Promise<FocusSessionState | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("focus_sessions").select(SESSION_SELECT).eq("id", sessionId).maybeSingle();
  if (!data) return null;
  return rowToState(data as unknown as RawSessionRow);
}

// Minutos líquidos de hoje já COMMITADOS (sessões finalizadas). A sessão
// ativa (se houver) soma seu próprio tempo líquido ao vivo no cliente.
// "Hoje" é sempre no fuso da usuária (cookie tz), não no fuso do servidor —
// mesmo padrão de lib/utils/timezone.ts usado em todo o resto do app.
export async function getTodayNetMinutes(userId: string, timeZone: string): Promise<number> {
  const supabase = await createClient();
  const startOfDay = startOfDayInTimeZone(toLocalDateKey(new Date(), timeZone), timeZone);

  const { data } = await supabase
    .from("focus_sessions")
    .select("actual_minutes")
    .eq("user_id", userId)
    .gte("started_at", startOfDay.toISOString())
    .not("ended_at", "is", null);

  return (data ?? []).reduce((sum, r) => sum + (r.actual_minutes ?? 0), 0);
}

export type FocusHistoryFilters = {
  search?: string;
  mode?: Mode | "all";
  period?: "week" | "month" | "all";
};

export type FocusHistoryEntry = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  subjectId: string | null;
  topicId: string | null;
  subjectName: string;
  topicName: string;
  activityType: string;
  activityTypeCustom: string | null;
  activityLabel: string;
  mode: Mode;
  netMinutes: number;
  cyclesCompleted: number;
  status: string;
  simuladoResult: { questionsDone: number; questionsCorrect: number } | null;
};

export async function getFocusHistory(userId: string, filters: FocusHistoryFilters = {}): Promise<FocusHistoryEntry[]> {
  const supabase = await createClient();
  const { search = "", mode = "all", period = "all" } = filters;

  let query = supabase
    .from("focus_sessions")
    .select(
      "id, started_at, ended_at, subject_id, topic_id, actual_minutes, cycles_completed, mode, activity_type, activity_type_custom, status, subjects(name), topics(name), question_logs(questions_done, questions_correct)",
    )
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(200);

  if (mode !== "all") query = query.eq("mode", mode);
  if (period !== "all") {
    const start = new Date();
    start.setDate(start.getDate() - (period === "week" ? 7 : 30));
    query = query.gte("started_at", start.toISOString());
  }

  const { data } = await query;

  const rows = (data ?? []) as unknown as {
    id: string;
    started_at: string;
    ended_at: string | null;
    subject_id: string | null;
    topic_id: string | null;
    actual_minutes: number | null;
    cycles_completed: number | null;
    mode: string;
    activity_type: string;
    activity_type_custom: string | null;
    status: string;
    subjects: { name: string } | { name: string }[] | null;
    topics: { name: string } | { name: string }[] | null;
    question_logs: { questions_done: number; questions_correct: number } | { questions_done: number; questions_correct: number }[] | null;
  }[];

  const normalize = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const entries: FocusHistoryEntry[] = rows.map((r) => {
    const subject = Array.isArray(r.subjects) ? r.subjects[0] : r.subjects;
    const topic = Array.isArray(r.topics) ? r.topics[0] : r.topics;
    const questionLog = Array.isArray(r.question_logs) ? r.question_logs[0] : r.question_logs;
    return {
      id: r.id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      subjectId: r.subject_id,
      topicId: r.topic_id,
      subjectName: subject?.name ?? "",
      topicName: topic?.name ?? "",
      activityType: r.activity_type,
      activityTypeCustom: r.activity_type_custom,
      activityLabel: activityTypeLabel(r.activity_type, r.activity_type_custom),
      mode: r.mode as Mode,
      netMinutes: r.actual_minutes ?? 0,
      cyclesCompleted: r.cycles_completed ?? 0,
      status: r.status,
      simuladoResult: questionLog
        ? { questionsDone: questionLog.questions_done, questionsCorrect: questionLog.questions_correct }
        : null,
    };
  });

  if (!search.trim()) return entries;
  const q = normalize(search.trim());
  return entries.filter(
    (e) => normalize(e.subjectName).includes(q) || normalize(e.topicName).includes(q) || normalize(e.activityLabel).includes(q),
  );
}
