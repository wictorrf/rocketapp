"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applyGrade, deriveStageLabel, type Grade, type StageLabel, type StoredSrsState } from "@/lib/srs/fsrs";

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
  intervalLabel: string;
};

export async function gradeFlashcardAction(
  flashcardId: string,
  sessionId: string,
  rating: Grade,
): Promise<GradeFlashcardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: srsRow } = await supabase
    .from("flashcard_srs_state")
    .select(
      "state, due_at, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, last_review_at",
    )
    .eq("flashcard_id", flashcardId)
    .single();

  if (!srsRow) return { error: "Cartão não encontrado.", stage: "novo", intervalLabel: "" };

  const before: StoredSrsState = {
    state: srsRow.state,
    dueAt: srsRow.due_at,
    stability: srsRow.stability,
    difficulty: srsRow.difficulty,
    elapsedDays: srsRow.elapsed_days,
    scheduledDays: srsRow.scheduled_days,
    learningSteps: srsRow.learning_steps,
    reps: srsRow.reps,
    lapses: srsRow.lapses,
    lastReviewAt: srsRow.last_review_at,
  };

  const now = new Date();
  const result = applyGrade(before, rating, now);

  await supabase
    .from("flashcard_srs_state")
    .update({
      state: result.after.state,
      due_at: result.after.dueAt,
      stability: result.after.stability,
      difficulty: result.after.difficulty,
      elapsed_days: result.after.elapsedDays,
      scheduled_days: result.after.scheduledDays,
      learning_steps: result.after.learningSteps,
      reps: result.after.reps,
      lapses: result.after.lapses,
      last_review_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("flashcard_id", flashcardId);

  await supabase.from("review_logs").insert({
    user_id: user.id,
    flashcard_id: flashcardId,
    session_id: sessionId,
    rating,
    state_before: before.state,
    state_after: result.after.state,
    due_before: before.dueAt,
    due_after: result.after.dueAt,
    stability_before: before.stability,
    stability_after: result.after.stability,
    difficulty_before: before.difficulty,
    difficulty_after: result.after.difficulty,
    scheduled_days: result.scheduledDays,
    elapsed_days: result.after.elapsedDays,
    reviewed_at: now.toISOString(),
  });

  return {
    error: null,
    stage: deriveStageLabel(result.after.state, false),
    intervalLabel: result.intervalLabel,
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
