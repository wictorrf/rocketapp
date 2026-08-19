import { createClient } from "@/lib/supabase/server";
import { deriveStageLabel, type StageLabel } from "@/lib/srs/sm2";
import { toLocalDateKey } from "@/lib/utils/format";

export type TopicSummary = {
  id: string;
  name: string;
  totalFlashcards: number;
  coveragePct: number;
  lastReviewedAt: string | null;
};

export async function listTopicsForSubject(subjectId: string): Promise<TopicSummary[]> {
  const supabase = await createClient();

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name")
    .eq("subject_id", subjectId)
    .order("created_at");
  if (!topics?.length) return [];
  const topicIds = topics.map((t) => t.id);

  const { data: flashcards } = await supabase
    .from("flashcards")
    .select("id, topic_id")
    .in("topic_id", topicIds);
  const topicToFlashcards = new Map<string, string[]>();
  for (const f of flashcards ?? []) {
    const list = topicToFlashcards.get(f.topic_id) ?? [];
    list.push(f.id);
    topicToFlashcards.set(f.topic_id, list);
  }
  const flashcardIds = (flashcards ?? []).map((f) => f.id);

  const { data: srsStates } = flashcardIds.length
    ? await supabase
        .from("flashcard_srs_state")
        .select("flashcard_id, repetitions, interval_days, last_reviewed_at")
        .in("flashcard_id", flashcardIds)
    : { data: [] as { flashcard_id: string; repetitions: number; interval_days: number; last_reviewed_at: string | null }[] };
  const srsByFlashcard = new Map((srsStates ?? []).map((s) => [s.flashcard_id, s]));

  return topics.map((topic) => {
    const ids = topicToFlashcards.get(topic.id) ?? [];
    const states = ids.map((id) => srsByFlashcard.get(id)).filter(Boolean) as NonNullable<
      ReturnType<typeof srsByFlashcard.get>
    >[];
    const consolidated = states.filter(
      (s) => deriveStageLabel({ repetitions: s.repetitions, intervalDays: s.interval_days }) === "consolidado",
    ).length;
    const lastReviewedAt =
      states
        .map((s) => s.last_reviewed_at)
        .filter((d): d is string => Boolean(d))
        .sort()
        .at(-1) ?? null;

    return {
      id: topic.id,
      name: topic.name,
      totalFlashcards: ids.length,
      coveragePct: ids.length ? Math.round((consolidated / ids.length) * 100) : 0,
      lastReviewedAt,
    };
  });
}

export async function getTopic(topicId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("topics")
    .select("id, name, subject_id, subjects(id, name)")
    .eq("id", topicId)
    .maybeSingle();
  return data;
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
