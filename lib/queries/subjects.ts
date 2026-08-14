import { createClient } from "@/lib/supabase/server";
import { deriveStageLabel } from "@/lib/srs/sm2";

export type SubjectSummary = {
  id: string;
  name: string;
  icon: string | null;
  topicCount: number;
  totalFlashcards: number;
  consolidatedFlashcards: number;
  coveragePct: number;
  accuracyPct: number | null;
  studiedMinutes: number;
  lastReviewedAt: string | null;
};

export async function listSubjectsWithSummary(userId: string): Promise<SubjectSummary[]> {
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, icon")
    .eq("user_id", userId)
    .order("created_at");
  if (!subjects?.length) return [];
  const subjectIds = subjects.map((s) => s.id);

  const { data: topics } = await supabase
    .from("topics")
    .select("id, subject_id")
    .in("subject_id", subjectIds);
  const topicToSubject = new Map((topics ?? []).map((t) => [t.id, t.subject_id as string]));
  const topicIds = (topics ?? []).map((t) => t.id);

  const { data: flashcards } = topicIds.length
    ? await supabase.from("flashcards").select("id, topic_id").in("topic_id", topicIds)
    : { data: [] as { id: string; topic_id: string }[] };
  const flashcardToSubject = new Map(
    (flashcards ?? []).map((f) => [f.id, topicToSubject.get(f.topic_id)]),
  );
  const flashcardIds = (flashcards ?? []).map((f) => f.id);

  const { data: srsStates } = flashcardIds.length
    ? await supabase
        .from("flashcard_srs_state")
        .select("flashcard_id, repetitions, interval_days, last_reviewed_at")
        .in("flashcard_id", flashcardIds)
    : { data: [] as { flashcard_id: string; repetitions: number; interval_days: number; last_reviewed_at: string | null }[] };

  const { data: reviewLogs } = flashcardIds.length
    ? await supabase.from("review_logs").select("flashcard_id, grade").in("flashcard_id", flashcardIds)
    : { data: [] as { flashcard_id: string; grade: number }[] };

  const { data: focusSessions } = await supabase
    .from("focus_sessions")
    .select("subject_id, actual_minutes")
    .in("subject_id", subjectIds);

  return subjects.map((subject) => {
    const subjectFlashcardIds = new Set(
      [...flashcardToSubject.entries()]
        .filter(([, subjectId]) => subjectId === subject.id)
        .map(([flashcardId]) => flashcardId),
    );

    const subjectSrsStates = (srsStates ?? []).filter((s) => subjectFlashcardIds.has(s.flashcard_id));
    const consolidatedFlashcards = subjectSrsStates.filter(
      (s) => deriveStageLabel({ repetitions: s.repetitions, intervalDays: s.interval_days }) === "consolidado",
    ).length;

    const lastReviewedAt = subjectSrsStates
      .map((s) => s.last_reviewed_at)
      .filter((d): d is string => Boolean(d))
      .sort()
      .at(-1) ?? null;

    const subjectLogs = (reviewLogs ?? []).filter((l) => subjectFlashcardIds.has(l.flashcard_id));
    const accuracyPct = subjectLogs.length
      ? Math.round((subjectLogs.filter((l) => l.grade > 0).length / subjectLogs.length) * 100)
      : null;

    const studiedMinutes = (focusSessions ?? [])
      .filter((f) => f.subject_id === subject.id)
      .reduce((sum, f) => sum + (f.actual_minutes ?? 0), 0);

    return {
      id: subject.id,
      name: subject.name,
      icon: subject.icon,
      topicCount: [...topicToSubject.values()].filter((s) => s === subject.id).length,
      totalFlashcards: subjectFlashcardIds.size,
      consolidatedFlashcards,
      coveragePct: subjectFlashcardIds.size
        ? Math.round((consolidatedFlashcards / subjectFlashcardIds.size) * 100)
        : 0,
      accuracyPct,
      studiedMinutes,
      lastReviewedAt,
    };
  });
}

export async function getSubject(subjectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("id, name, icon")
    .eq("id", subjectId)
    .maybeSingle();
  return data;
}
