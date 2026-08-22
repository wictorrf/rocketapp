import { createClient } from "@/lib/supabase/server";
import { deriveStageLabel, type StageLabel } from "@/lib/srs/sm2";
import { toLocalDateKey } from "@/lib/utils/format";

export type TopicStatusFilter = "all" | "active" | "archived" | "pending" | "with_questions";
export type TopicSortKey =
  | "name"
  | "created_desc"
  | "last_activity"
  | "studied_minutes"
  | "flashcard_count"
  | "pending_reviews";

export type TopicRecord = {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  tags: string[];
  note: string | null;
  archivedAt: string | null;
};

export type TopicSummary = TopicRecord & {
  createdAt: string;
  totalFlashcards: number;
  pendingReviewsCount: number;
  questionsAccuracyPct: number | null;
  questionsCount: number;
  studiedMinutes: number;
  lastActivityAt: string | null;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export async function listTopicsForSubject(
  subjectId: string,
  opts: { search?: string; status?: TopicStatusFilter; sort?: TopicSortKey } = {},
): Promise<TopicSummary[]> {
  const supabase = await createClient();
  const { search = "", status = "active", sort = "name" } = opts;

  let topicsQuery = supabase
    .from("topics")
    .select("id, name, emoji, color, tags, note, archived_at, created_at")
    .eq("subject_id", subjectId);
  if (status === "active" || status === "pending" || status === "with_questions") {
    topicsQuery = topicsQuery.is("archived_at", null);
  }
  if (status === "archived") topicsQuery = topicsQuery.not("archived_at", "is", null);

  const { data: topics } = await topicsQuery.order("created_at");
  if (!topics?.length) return [];
  const topicIds = topics.map((t) => t.id);

  const { data: flashcards } = await supabase.from("flashcards").select("id, topic_id").in("topic_id", topicIds);
  const topicToFlashcards = new Map<string, string[]>();
  for (const f of flashcards ?? []) {
    const list = topicToFlashcards.get(f.topic_id) ?? [];
    list.push(f.id);
    topicToFlashcards.set(f.topic_id, list);
  }
  const flashcardIds = (flashcards ?? []).map((f) => f.id);

  const todayKey = toLocalDateKey(new Date());
  const { data: srsStates } = flashcardIds.length
    ? await supabase
        .from("flashcard_srs_state")
        .select("flashcard_id, due_at, last_reviewed_at")
        .in("flashcard_id", flashcardIds)
    : { data: [] as { flashcard_id: string; due_at: string; last_reviewed_at: string | null }[] };
  const srsByFlashcard = new Map((srsStates ?? []).map((s) => [s.flashcard_id, s]));

  const { data: questionLogs } = await supabase
    .from("question_logs")
    .select("topic_id, questions_done, questions_correct, logged_at")
    .in("topic_id", topicIds);

  const { data: focusSessions } = await supabase
    .from("focus_sessions")
    .select("topic_id, actual_minutes, started_at")
    .in("topic_id", topicIds);

  const rows = topics.map((topic) => {
    const ids = topicToFlashcards.get(topic.id) ?? [];
    const states = ids.map((id) => srsByFlashcard.get(id)).filter(Boolean) as NonNullable<
      ReturnType<typeof srsByFlashcard.get>
    >[];
    const pendingReviewsCount = states.filter((s) => s.due_at <= todayKey).length;
    const lastReviewedAt = states
      .map((s) => s.last_reviewed_at)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

    const topicQuestionLogs = (questionLogs ?? []).filter((q) => q.topic_id === topic.id);
    const totalDone = topicQuestionLogs.reduce((sum, q) => sum + q.questions_done, 0);
    const totalCorrect = topicQuestionLogs.reduce((sum, q) => sum + q.questions_correct, 0);
    const lastQuestionLogAt = topicQuestionLogs.map((q) => q.logged_at).sort().at(-1) ?? null;

    const topicFocusSessions = (focusSessions ?? []).filter((f) => f.topic_id === topic.id);
    const studiedMinutes = topicFocusSessions.reduce((sum, f) => sum + (f.actual_minutes ?? 0), 0);
    const lastFocusAt = topicFocusSessions.map((f) => f.started_at).sort().at(-1) ?? null;

    const lastActivityAt = [lastReviewedAt, lastQuestionLogAt, lastFocusAt]
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

    return {
      id: topic.id,
      name: topic.name,
      emoji: topic.emoji,
      color: topic.color,
      tags: (topic.tags as string[] | null) ?? [],
      note: topic.note,
      archivedAt: topic.archived_at,
      createdAt: topic.created_at,
      totalFlashcards: ids.length,
      pendingReviewsCount,
      questionsAccuracyPct: totalDone ? Math.round((totalCorrect / totalDone) * 100) : null,
      questionsCount: topicQuestionLogs.length,
      studiedMinutes,
      lastActivityAt,
    };
  });

  const searched = search.trim()
    ? rows.filter(
        (r) =>
          normalize(r.name).includes(normalize(search.trim())) ||
          r.tags.some((t) => normalize(t).includes(normalize(search.trim()))),
      )
    : rows;
  const statusFiltered =
    status === "pending"
      ? searched.filter((r) => r.pendingReviewsCount > 0)
      : status === "with_questions"
        ? searched.filter((r) => r.questionsCount > 0)
        : searched;

  return statusFiltered.sort((a, b) => {
    switch (sort) {
      case "created_desc":
        return b.createdAt.localeCompare(a.createdAt);
      case "last_activity":
        return (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "");
      case "studied_minutes":
        return b.studiedMinutes - a.studiedMinutes;
      case "flashcard_count":
        return b.totalFlashcards - a.totalFlashcards;
      case "pending_reviews":
        return b.pendingReviewsCount - a.pendingReviewsCount;
      default:
        return a.name.localeCompare(b.name, "pt-BR");
    }
  });
}

export async function getTopic(topicId: string): Promise<
  (TopicRecord & { subject: { id: string; name: string; icon: string | null } | null }) | null
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("topics")
    .select("id, name, subject_id, emoji, color, tags, note, archived_at, subjects(id, name, icon)")
    .eq("id", topicId)
    .maybeSingle();
  if (!data) return null;
  const subjectRow = Array.isArray(data.subjects) ? data.subjects[0] : data.subjects;
  return {
    id: data.id,
    name: data.name,
    emoji: data.emoji,
    color: data.color,
    tags: data.tags ?? [],
    note: data.note,
    archivedAt: data.archived_at,
    subject: subjectRow ? { id: subjectRow.id, name: subjectRow.name, icon: subjectRow.icon } : null,
  };
}

export async function checkTopicNameExists(
  subjectId: string,
  name: string,
  excludeId?: string,
): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();
  let query = supabase
    .from("topics")
    .select("id, name")
    .eq("subject_id", subjectId)
    .ilike("name", name.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.maybeSingle();
  return data;
}

export async function getTopicDeletionImpact(topicId: string) {
  const supabase = await createClient();
  const [{ count: flashcardCount }, { count: questionLogCount }, { count: calendarEventCount }, { count: focusSessionCount }] =
    await Promise.all([
      supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("topic_id", topicId),
      supabase.from("question_logs").select("id", { count: "exact", head: true }).eq("topic_id", topicId),
      supabase.from("calendar_tasks").select("id", { count: "exact", head: true }).eq("topic_id", topicId),
      supabase.from("focus_sessions").select("id", { count: "exact", head: true }).eq("topic_id", topicId),
    ]);

  return {
    flashcardCount: flashcardCount ?? 0,
    questionLogCount: questionLogCount ?? 0,
    calendarEventCount: calendarEventCount ?? 0,
    focusSessionCount: focusSessionCount ?? 0,
  };
}

export async function listOtherActiveTopicsForUser(userId: string, excludeTopicId: string) {
  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId)
    .is("archived_at", null);
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const subjectIds = (subjects ?? []).map((s) => s.id);
  if (!subjectIds.length) return [];

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in("subject_id", subjectIds)
    .is("archived_at", null)
    .neq("id", excludeTopicId)
    .order("name");

  return (topics ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    subjectName: subjectNameById.get(t.subject_id) ?? "",
  }));
}

export type FlashcardWithStage = {
  id: string;
  front: string;
  back: string;
  imageUrl: string | null;
  stage: StageLabel;
  dueAt: string;
  lastReviewedAt: string | null;
  intervalDays: number;
};

export type TopicPanel = {
  totalFlashcards: number;
  reviewedAtLeastOnce: number;
  novoCount: number;
  aprendendoCount: number;
  consolidadoCount: number;
  dueTodayCount: number;
  studiedMinutes: number;
  needsReview: FlashcardWithStage[]; // novo/aprendendo, atrasados primeiro
  consolidated: FlashcardWithStage[];
};

export async function getTopicPanel(topicId: string): Promise<TopicPanel> {
  const supabase = await createClient();

  const { data: flashcards } = await supabase
    .from("flashcards")
    .select("id, front, back, image_url, flashcard_srs_state(repetitions, interval_days, due_at, last_reviewed_at)")
    .eq("topic_id", topicId)
    .order("created_at");

  const { data: focusSessions } = await supabase
    .from("focus_sessions")
    .select("actual_minutes")
    .eq("topic_id", topicId);
  const studiedMinutes = (focusSessions ?? []).reduce((sum, f) => sum + (f.actual_minutes ?? 0), 0);

  const todayKey = toLocalDateKey(new Date());

  const withStage: FlashcardWithStage[] = (flashcards ?? []).map((f) => {
    const srs = Array.isArray(f.flashcard_srs_state) ? f.flashcard_srs_state[0] : f.flashcard_srs_state;
    return {
      id: f.id,
      front: f.front,
      back: f.back,
      imageUrl: f.image_url,
      stage: deriveStageLabel({ repetitions: srs?.repetitions ?? 0, intervalDays: srs?.interval_days ?? 0 }),
      dueAt: srs?.due_at ?? todayKey,
      lastReviewedAt: srs?.last_reviewed_at ?? null,
      intervalDays: srs?.interval_days ?? 0,
    };
  });

  const needsReview = withStage
    .filter((f) => f.stage !== "consolidado")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const consolidated = withStage.filter((f) => f.stage === "consolidado");

  return {
    totalFlashcards: withStage.length,
    reviewedAtLeastOnce: withStage.filter((f) => f.lastReviewedAt).length,
    novoCount: withStage.filter((f) => f.stage === "novo").length,
    aprendendoCount: withStage.filter((f) => f.stage === "aprendendo").length,
    consolidadoCount: consolidated.length,
    dueTodayCount: withStage.filter((f) => f.dueAt <= todayKey).length,
    studiedMinutes,
    needsReview,
    consolidated,
  };
}
