"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applyGrade, deriveStageLabel, type Grade, type StageLabel, type StoredSrsState } from "@/lib/srs/fsrs";
import { getFlashcardReviewHistory, type ReviewHistoryEntry } from "@/lib/queries/review";

export async function getFlashcardReviewHistoryAction(flashcardId: string): Promise<ReviewHistoryEntry[]> {
  return getFlashcardReviewHistory(flashcardId);
}

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

// Grava a nota via a função Postgres grade_flashcard (migração 0009): o
// cálculo do FSRS continua aqui em TypeScript (mesma lib ts-fsrs de sempre),
// mas a ESCRITA (update do estado + insert do histórico) roda numa
// transação só, travando a linha do cartão — sem risco de update e insert
// ficarem dessincronizados se um deles falhar. idempotencyKey garante que
// reenviar a mesma tentativa (retry de rede, duplo clique) nunca aplica a
// nota duas vezes.
export async function gradeFlashcardAction(params: {
  flashcardId: string;
  sessionId: string;
  rating: Grade;
  idempotencyKey: string;
  timezone: string;
  responseDurationMs: number;
}): Promise<GradeFlashcardResult> {
  const { flashcardId, sessionId, rating, idempotencyKey, timezone, responseDurationMs } = params;
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

  const { data, error } = await supabase.rpc("grade_flashcard", {
    p_flashcard_id: flashcardId,
    p_session_id: sessionId,
    p_idempotency_key: idempotencyKey,
    p_expected_reps: before.reps,
    p_rating: rating,
    p_state_after: result.after.state,
    p_due_after: result.after.dueAt,
    p_stability_after: result.after.stability,
    p_difficulty_after: result.after.difficulty,
    p_elapsed_days_after: result.after.elapsedDays,
    p_scheduled_days: result.scheduledDays,
    p_learning_steps_after: result.after.learningSteps,
    p_reps_after: result.after.reps,
    p_lapses_after: result.after.lapses,
    p_reviewed_at: now.toISOString(),
    p_timezone: timezone,
    p_response_duration_ms: responseDurationMs,
  });

  if (error || !data?.[0]) {
    return {
      error:
        error?.code === "40001"
          ? "Esse cartão foi atualizado em outro lugar. Recarregue a página e tente de novo."
          : "Não foi possível salvar sua resposta agora.",
      stage: "novo",
      intervalLabel: "",
    };
  }

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
