import { createClient } from "@/lib/supabase/server";
import { weightedAccuracyPct } from "@/lib/metrics/calc";

export type SubjectStatusFilter = "all" | "active" | "archived" | "pending";
export type SubjectSortKey =
  | "name"
  | "created_desc"
  | "last_activity"
  | "studied_minutes"
  | "topic_count"
  | "flashcard_count"
  | "pending_reviews"
  | "manual";

export type SubjectRecord = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  period: string | null;
  note: string | null;
  archivedAt: string | null;
};

export type SubjectSummary = SubjectRecord & {
  createdAt: string;
  sortOrder: number;
  topicCount: number;
  totalFlashcards: number;
  pendingReviewsCount: number;
  questionsAccuracyPct: number | null;
  studiedMinutes: number;
  lastActivityAt: string | null;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export async function listSubjectsWithSummary(
  userId: string,
  opts: { search?: string; status?: SubjectStatusFilter; sort?: SubjectSortKey } = {},
): Promise<SubjectSummary[]> {
  const supabase = await createClient();
  const { search = "", status = "active", sort = "name" } = opts;

  let subjectsQuery = supabase
    .from("subjects")
    .select("id, name, icon, color, period, note, archived_at, created_at, sort_order")
    .eq("user_id", userId);
  if (status === "active" || status === "pending") subjectsQuery = subjectsQuery.is("archived_at", null);
  if (status === "archived") subjectsQuery = subjectsQuery.not("archived_at", "is", null);

  const { data: subjects } = await subjectsQuery.order("created_at");
  if (!subjects?.length) return [];
  const subjectIds = subjects.map((s) => s.id);

  const { data: topics } = await supabase
    .from("topics")
    .select("id, subject_id")
    .in("subject_id", subjectIds)
    .is("archived_at", null);
  const topicToSubject = new Map((topics ?? []).map((t) => [t.id, t.subject_id as string]));
  const topicIds = (topics ?? []).map((t) => t.id);

  const { data: flashcards } = topicIds.length
    ? await supabase.from("flashcards").select("id, topic_id").in("topic_id", topicIds)
    : { data: [] as { id: string; topic_id: string }[] };
  const flashcardToSubject = new Map(
    (flashcards ?? []).map((f) => [f.id, topicToSubject.get(f.topic_id)]),
  );
  const flashcardIds = (flashcards ?? []).map((f) => f.id);

  const nowIso = new Date().toISOString();
  const { data: srsStates } = flashcardIds.length
    ? await supabase
        .from("flashcard_srs_state")
        .select("flashcard_id, due_at, last_review_at, suspended_at")
        .in("flashcard_id", flashcardIds)
    : {
        data: [] as { flashcard_id: string; due_at: string; last_review_at: string | null; suspended_at: string | null }[],
      };

  const { data: questionLogs } = await supabase
    .from("question_logs")
    .select("topic_id, questions_done, questions_correct, logged_at")
    .in("topic_id", topicIds.length ? topicIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: focusSessions } = await supabase
    .from("focus_sessions")
    .select("subject_id, actual_minutes, started_at")
    .in("subject_id", subjectIds);

  const rows = subjects.map((subject) => {
    const subjectFlashcardIds = new Set(
      [...flashcardToSubject.entries()]
        .filter(([, sId]) => sId === subject.id)
        .map(([flashcardId]) => flashcardId),
    );
    const subjectTopicIds = new Set(
      [...topicToSubject.entries()].filter(([, sId]) => sId === subject.id).map(([tId]) => tId),
    );

    const subjectSrsStates = (srsStates ?? []).filter((s) => subjectFlashcardIds.has(s.flashcard_id));
    const pendingReviewsCount = subjectSrsStates.filter((s) => !s.suspended_at && s.due_at <= nowIso).length;
    const lastReviewedAt = subjectSrsStates
      .map((s) => s.last_review_at)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

    const subjectQuestionLogs = (questionLogs ?? []).filter((q) => subjectTopicIds.has(q.topic_id));
    const totalDone = subjectQuestionLogs.reduce((sum, q) => sum + q.questions_done, 0);
    const totalCorrect = subjectQuestionLogs.reduce((sum, q) => sum + q.questions_correct, 0);
    const questionsAccuracyPct = weightedAccuracyPct(totalCorrect, totalDone);
    const lastQuestionLogAt = subjectQuestionLogs.map((q) => q.logged_at).sort().at(-1) ?? null;

    const subjectFocusSessions = (focusSessions ?? []).filter((f) => f.subject_id === subject.id);
    const studiedMinutes = subjectFocusSessions.reduce((sum, f) => sum + (f.actual_minutes ?? 0), 0);
    const lastFocusAt = subjectFocusSessions.map((f) => f.started_at).sort().at(-1) ?? null;

    const lastActivityAt = [lastReviewedAt, lastQuestionLogAt, lastFocusAt]
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

    return {
      id: subject.id,
      name: subject.name,
      icon: subject.icon,
      color: subject.color,
      period: subject.period,
      note: subject.note,
      archivedAt: subject.archived_at,
      createdAt: subject.created_at,
      sortOrder: subject.sort_order,
      topicCount: subjectTopicIds.size,
      totalFlashcards: subjectFlashcardIds.size,
      pendingReviewsCount,
      questionsAccuracyPct,
      studiedMinutes,
      lastActivityAt,
    };
  });

  const filtered = search.trim()
    ? rows.filter((r) => normalize(r.name).includes(normalize(search.trim())))
    : rows;
  const statusFiltered = status === "pending" ? filtered.filter((r) => r.pendingReviewsCount > 0) : filtered;

  return statusFiltered.sort((a, b) => {
    switch (sort) {
      case "created_desc":
        return b.createdAt.localeCompare(a.createdAt);
      case "last_activity":
        return (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "");
      case "studied_minutes":
        return b.studiedMinutes - a.studiedMinutes;
      case "topic_count":
        return b.topicCount - a.topicCount;
      case "flashcard_count":
        return b.totalFlashcards - a.totalFlashcards;
      case "pending_reviews":
        return b.pendingReviewsCount - a.pendingReviewsCount;
      case "manual":
        return a.sortOrder - b.sortOrder;
      default:
        return a.name.localeCompare(b.name, "pt-BR");
    }
  });
}

export async function getSubject(subjectId: string): Promise<SubjectRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id, name, icon, color, period, note, archived_at")
    .eq("id", subjectId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    icon: data.icon,
    color: data.color,
    period: data.period,
    note: data.note,
    archivedAt: data.archived_at,
  };
}

export async function checkSubjectNameExists(
  userId: string,
  name: string,
  excludeId?: string,
): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();
  let query = supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId)
    .ilike("name", name.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.maybeSingle();
  return data;
}

export async function getSubjectDeletionImpact(subjectId: string) {
  const supabase = await createClient();
  const { data: topics } = await supabase.from("topics").select("id").eq("subject_id", subjectId);
  const topicIds = (topics ?? []).map((t) => t.id);

  const [{ count: flashcardCount }, { count: questionLogCount }, { count: calendarEventCount }, { count: focusSessionCount }] =
    await Promise.all([
      topicIds.length
        ? supabase.from("flashcards").select("id", { count: "exact", head: true }).in("topic_id", topicIds)
        : Promise.resolve({ count: 0 }),
      topicIds.length
        ? supabase.from("question_logs").select("id", { count: "exact", head: true }).in("topic_id", topicIds)
        : Promise.resolve({ count: 0 }),
      supabase.from("calendar_tasks").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
      supabase.from("focus_sessions").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
    ]);

  return {
    topicCount: topicIds.length,
    flashcardCount: flashcardCount ?? 0,
    questionLogCount: questionLogCount ?? 0,
    calendarEventCount: calendarEventCount ?? 0,
    focusSessionCount: focusSessionCount ?? 0,
  };
}

export async function listActiveSubjectsForMove(userId: string, excludeId?: string) {
  const supabase = await createClient();
  let query = supabase.from("subjects").select("id, name, icon").eq("user_id", userId).is("archived_at", null);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.order("name");
  return data ?? [];
}

export type SubjectWithTopicsOption = {
  id: string;
  name: string;
  topics: { id: string; name: string }[];
};

// Disciplinas ativas com seus assuntos aninhados — alimenta os seletores
// em cascata (Calendário, Planejamento mensal) onde o assunto é filtrado
// pela disciplina escolhida. Disciplinas e assuntos arquivados ficam fora.
export async function listActiveSubjectsWithTopics(userId: string): Promise<SubjectWithTopicsOption[]> {
  const supabase = await createClient();
  const [{ data: subjects }, { data: topics }] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("user_id", userId).is("archived_at", null).order("name"),
    supabase.from("topics").select("id, name, subject_id").eq("user_id", userId).is("archived_at", null).order("name"),
  ]);

  return (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    topics: (topics ?? []).filter((t) => t.subject_id === s.id).map((t) => ({ id: t.id, name: t.name })),
  }));
}
