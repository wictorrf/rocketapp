"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeSM2, deriveStageLabel, type ReviewGrade, type StageLabel } from "@/lib/srs/sm2";
import { toLocalDateKey } from "@/lib/utils/format";

export async function startReviewSessionAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subjectId = String(formData.get("subjectId") ?? "");
  const topicId = String(formData.get("topicId") ?? "");

  const { data, error } = await supabase
    .from("review_sessions")
    .insert({ user_id: user.id, topic_id: topicId })
    .select("id")
    .single();

  if (error || !data) redirect(`/subjects/${subjectId}/topics/${topicId}`);

  redirect(`/subjects/${subjectId}/topics/${topicId}/review?session=${data.id}`);
}

// Sessão "revisar tudo misturado" — sem assunto específico, spanning todas
// as disciplinas da usuária.
export async function startMixedReviewSessionAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("review_sessions")
    .insert({ user_id: user.id, topic_id: null })
    .select("id")
    .single();

  if (error || !data) redirect("/flashcards");

  redirect(`/flashcards/review?session=${data.id}`);
}

export type GradeFlashcardResult = {
  error: string | null;
  stage: StageLabel;
  intervalDays: number;
};

export async function gradeFlashcardAction(
  flashcardId: string,
  sessionId: string,
  grade: ReviewGrade,
): Promise<GradeFlashcardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: state } = await supabase
    .from("flashcard_srs_state")
    .select("repetitions, ease_factor, interval_days, lapses")
    .eq("flashcard_id", flashcardId)
    .single();

  if (!state) return { error: "Cartão não encontrado.", stage: "novo", intervalDays: 0 };

  const before = {
    repetitions: state.repetitions,
    easeFactor: Number(state.ease_factor),
    intervalDays: state.interval_days,
  };
  const result = computeSM2(before, grade);
  const dueAtKey = toLocalDateKey(result.dueAt);

  await supabase
    .from("flashcard_srs_state")
    .update({
      repetitions: result.repetitions,
      ease_factor: result.easeFactor,
      interval_days: result.intervalDays,
      due_at: dueAtKey,
      last_reviewed_at: new Date().toISOString(),
      lapses: state.lapses + (result.lapsed ? 1 : 0),
    })
    .eq("flashcard_id", flashcardId);

  await supabase.from("review_logs").insert({
    user_id: user.id,
    flashcard_id: flashcardId,
    session_id: sessionId,
    grade,
    repetitions_before: before.repetitions,
    repetitions_after: result.repetitions,
    ease_factor_before: before.easeFactor,
    ease_factor_after: result.easeFactor,
    interval_before: before.intervalDays,
    interval_after: result.intervalDays,
  });

  return {
    error: null,
    stage: deriveStageLabel({ repetitions: result.repetitions, intervalDays: result.intervalDays }),
    intervalDays: result.intervalDays,
  };
}

export async function finishReviewSessionAction(
  sessionId: string,
  cardsTotal: number,
  cardsRemembered: number,
) {
  const supabase = await createClient();
  await supabase
    .from("review_sessions")
    .update({
      ended_at: new Date().toISOString(),
      cards_total: cardsTotal,
      cards_remembered: cardsRemembered,
    })
    .eq("id", sessionId);
}
