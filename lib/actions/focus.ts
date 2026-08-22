"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { phaseDurationSeconds, initialPhaseFor, nextPhaseAfterCompletion, type Mode, type Phase } from "@/lib/timer/pomodoro";
import {
  getActiveFocusSession,
  getFocusSessionById,
  getFocusHistory,
  type FocusSessionState,
  type FocusHistoryFilters,
  type FocusHistoryEntry,
} from "@/lib/queries/focus";

export type FocusActionResult = {
  error: string | null;
  session: FocusSessionState | null;
  conflict?: FocusSessionState | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function revalidateFocusPaths() {
  revalidatePath("/focus");
  revalidatePath("/focus/history");
  revalidatePath("/dashboard");
  revalidatePath("/metrics");
}

// Fecha a linha da sessão — usado tanto por "Encerrar" explícito quanto por
// "Encerrar sessão anterior" ao detectar conflito. Descartar remove a linha
// (não deve aparecer no histórico nem nas Métricas); guardar computa o
// tempo líquido final a partir do checkpoint + hora real.
async function finalizeSessionRow(supabase: SupabaseClient, sessionId: string, discard: boolean) {
  if (discard) {
    await supabase.from("focus_sessions").delete().eq("id", sessionId);
    return;
  }

  const { data: row } = await supabase
    .from("focus_sessions")
    .select("status, phase, phase_started_at, net_seconds, cycle_index")
    .eq("id", sessionId)
    .single();
  if (!row) return;

  let netSeconds = row.net_seconds;
  if (row.status === "running" && (row.phase === "foco" || row.phase === "simulado")) {
    const elapsed = Math.max(0, (Date.now() - new Date(row.phase_started_at).getTime()) / 1000);
    netSeconds += elapsed;
  }

  await supabase
    .from("focus_sessions")
    .update({
      status: "finished",
      ended_at: new Date().toISOString(),
      net_seconds: Math.round(netSeconds),
      actual_minutes: Math.round(netSeconds / 60),
      cycles_completed: row.cycle_index,
    })
    .eq("id", sessionId);
}

export async function getActiveSessionAction(): Promise<FocusSessionState | null> {
  const { user } = await requireUser();
  return getActiveFocusSession(user.id);
}

export async function startFocusSessionAction(params: {
  subjectId: string;
  topicId: string;
  activityType: string;
  activityTypeCustom: string | null;
  mode: Mode;
  simuladoMinutes: number;
  forceEndPrevious?: boolean;
}): Promise<FocusActionResult> {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("focus_sessions")
    .select("id")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (existing) {
    if (!params.forceEndPrevious) {
      const conflict = await getFocusSessionById(existing.id);
      return { error: null, session: null, conflict };
    }
    await finalizeSessionRow(supabase, existing.id, false);
  }

  const phase = initialPhaseFor(params.mode);
  const durationSeconds = phaseDurationSeconds(params.mode, phase, params.simuladoMinutes);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("focus_sessions")
    .insert({
      user_id: user.id,
      subject_id: params.subjectId,
      topic_id: params.topicId,
      activity_type: params.activityType,
      activity_type_custom: params.activityType === "outro" ? params.activityTypeCustom : null,
      mode: params.mode,
      status: "running",
      phase,
      cycle_index: 0,
      phase_started_at: now,
      phase_planned_seconds: durationSeconds,
      phase_remaining_seconds: durationSeconds,
      net_seconds: 0,
      planned_minutes: params.mode === "simulado" ? Math.round(params.simuladoMinutes) : null,
      cycles_planned: params.mode === "simulado" ? null : 4,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível iniciar a sessão.", session: null };

  revalidateFocusPaths();
  return { error: null, session: await getFocusSessionById(data.id) };
}

export async function pauseFocusSessionAction(sessionId: string): Promise<FocusActionResult> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("focus_sessions")
    .select("status, phase, phase_started_at, phase_remaining_seconds, net_seconds, user_id")
    .eq("id", sessionId)
    .single();
  if (!row || row.user_id !== user.id) return { error: "Sessão não encontrada.", session: null };
  if (row.status !== "running") return { error: null, session: await getFocusSessionById(sessionId) };

  const elapsedSeconds = Math.max(0, (Date.now() - new Date(row.phase_started_at).getTime()) / 1000);
  const isNetPhase = row.phase === "foco" || row.phase === "simulado";
  const newRemaining = Math.max(0, row.phase_remaining_seconds - elapsedSeconds);
  const newNet = isNetPhase ? row.net_seconds + elapsedSeconds : row.net_seconds;

  await supabase
    .from("focus_sessions")
    .update({ status: "paused", phase_remaining_seconds: Math.round(newRemaining), net_seconds: Math.round(newNet) })
    .eq("id", sessionId);

  revalidateFocusPaths();
  return { error: null, session: await getFocusSessionById(sessionId) };
}

export async function resumeFocusSessionAction(sessionId: string): Promise<FocusActionResult> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase.from("focus_sessions").select("status, user_id").eq("id", sessionId).single();
  if (!row || row.user_id !== user.id) return { error: "Sessão não encontrada.", session: null };
  if (row.status !== "paused") return { error: null, session: await getFocusSessionById(sessionId) };

  await supabase
    .from("focus_sessions")
    .update({ status: "running", phase_started_at: new Date().toISOString() })
    .eq("id", sessionId);

  revalidateFocusPaths();
  return { error: null, session: await getFocusSessionById(sessionId) };
}

// Chamada automaticamente pelo cliente quando a contagem regressiva chega a
// zero (baseado em hora real, não só decremento visual). Registra o tempo
// líquido da fase concluída e "congela" o checkpoint em zero — a fase
// seguinte só começa quando a pessoa escolher (Iniciar descanso / Iniciar
// próximo ciclo / Iniciar pausa longa), nunca automaticamente.
export async function completePhaseAction(sessionId: string): Promise<FocusActionResult> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("focus_sessions")
    .select("status, phase, mode, cycle_index, phase_planned_seconds, net_seconds, user_id")
    .eq("id", sessionId)
    .single();
  if (!row || row.user_id !== user.id) return { error: "Sessão não encontrada.", session: null };
  if (row.status !== "running") return { error: null, session: await getFocusSessionById(sessionId) };

  const isNetPhase = row.phase === "foco" || row.phase === "simulado";
  const newNet = isNetPhase ? row.net_seconds + row.phase_planned_seconds : row.net_seconds;
  const now = new Date().toISOString();

  if (row.mode === "simulado") {
    // Simulado não tem próxima fase — a conclusão finaliza a sessão.
    await supabase
      .from("focus_sessions")
      .update({
        status: "finished",
        ended_at: now,
        net_seconds: Math.round(newNet),
        actual_minutes: Math.round(newNet / 60),
        phase_remaining_seconds: 0,
        phase_started_at: now,
      })
      .eq("id", sessionId);
  } else {
    await supabase
      .from("focus_sessions")
      .update({
        net_seconds: Math.round(newNet),
        phase_remaining_seconds: 0,
        phase_started_at: now,
        cycles_completed: row.phase === "foco" ? row.cycle_index + 1 : row.cycle_index,
      })
      .eq("id", sessionId);
  }

  revalidateFocusPaths();
  return { error: null, session: await getFocusSessionById(sessionId) };
}

export async function advanceToNextPhaseAction(sessionId: string): Promise<FocusActionResult> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("focus_sessions")
    .select("phase, mode, cycle_index, planned_minutes, user_id")
    .eq("id", sessionId)
    .single();
  if (!row || row.user_id !== user.id) return { error: "Sessão não encontrada.", session: null };

  const { phase: nextPhase, cycleIndex: nextCycleIndex } = nextPhaseAfterCompletion(
    row.mode as Mode,
    row.phase as Phase,
    row.cycle_index,
  );
  const duration = phaseDurationSeconds(row.mode as Mode, nextPhase, row.planned_minutes ?? 60);

  await supabase
    .from("focus_sessions")
    .update({
      phase: nextPhase,
      cycle_index: nextCycleIndex,
      phase_planned_seconds: duration,
      phase_remaining_seconds: duration,
      phase_started_at: new Date().toISOString(),
      status: "running",
    })
    .eq("id", sessionId);

  revalidateFocusPaths();
  return { error: null, session: await getFocusSessionById(sessionId) };
}

// "Reiniciar somente este ciclo" — não mexe no tempo líquido já commitado
// de ciclos anteriores, só reinicia a contagem da fase atual.
export async function resetCurrentPhaseAction(sessionId: string): Promise<FocusActionResult> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("focus_sessions")
    .select("phase, mode, planned_minutes, user_id")
    .eq("id", sessionId)
    .single();
  if (!row || row.user_id !== user.id) return { error: "Sessão não encontrada.", session: null };

  const duration = phaseDurationSeconds(row.mode as Mode, row.phase as Phase, row.planned_minutes ?? 60);
  await supabase
    .from("focus_sessions")
    .update({
      phase_planned_seconds: duration,
      phase_remaining_seconds: duration,
      phase_started_at: new Date().toISOString(),
      status: "running",
    })
    .eq("id", sessionId);

  revalidateFocusPaths();
  return { error: null, session: await getFocusSessionById(sessionId) };
}

// "Reiniciar toda a sequência" — descarta o tempo líquido e os ciclos já
// completos dessa tentativa e recomeça do ciclo 1.
export async function resetSequenceAction(sessionId: string): Promise<FocusActionResult> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("focus_sessions")
    .select("mode, planned_minutes, user_id")
    .eq("id", sessionId)
    .single();
  if (!row || row.user_id !== user.id) return { error: "Sessão não encontrada.", session: null };

  const phase = initialPhaseFor(row.mode as Mode);
  const duration = phaseDurationSeconds(row.mode as Mode, phase, row.planned_minutes ?? 60);
  await supabase
    .from("focus_sessions")
    .update({
      phase,
      cycle_index: 0,
      cycles_completed: 0,
      net_seconds: 0,
      phase_planned_seconds: duration,
      phase_remaining_seconds: duration,
      phase_started_at: new Date().toISOString(),
      status: "running",
    })
    .eq("id", sessionId);

  revalidateFocusPaths();
  return { error: null, session: await getFocusSessionById(sessionId) };
}

export async function finishFocusSessionAction(sessionId: string, discard: boolean): Promise<{ error: string | null }> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase.from("focus_sessions").select("user_id").eq("id", sessionId).single();
  if (!row || row.user_id !== user.id) return { error: "Sessão não encontrada." };

  await finalizeSessionRow(supabase, sessionId, discard);
  revalidateFocusPaths();
  return { error: null };
}

export async function registerSimuladoResultAction(
  sessionId: string,
  questionsDone: number,
  questionsCorrect: number,
  note: string,
): Promise<{ error: string | null }> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("focus_sessions")
    .select("user_id, subject_id, topic_id")
    .eq("id", sessionId)
    .single();
  if (!row || row.user_id !== user.id) return { error: "Sessão não encontrada." };
  if (!row.topic_id) return { error: "Assunto não encontrado pra essa sessão." };
  if (!Number.isFinite(questionsDone) || questionsDone <= 0) {
    return { error: "Informe a quantidade de questões respondidas." };
  }
  if (!Number.isFinite(questionsCorrect) || questionsCorrect < 0 || questionsCorrect > questionsDone) {
    return { error: "Os acertos não podem ultrapassar o total respondido." };
  }

  const { data: log, error } = await supabase
    .from("question_logs")
    .insert({
      user_id: user.id,
      topic_id: row.topic_id,
      questions_done: Math.round(questionsDone),
      questions_correct: Math.round(questionsCorrect),
      note: note.trim() || null,
      log_type: "simulado_externo",
    })
    .select("id")
    .single();
  if (error || !log) return { error: "Não foi possível registrar o resultado." };

  await supabase.from("focus_sessions").update({ question_log_id: log.id }).eq("id", sessionId);

  revalidatePath("/dashboard");
  revalidatePath("/metrics");
  if (row.subject_id) revalidatePath(`/subjects/${row.subject_id}/topics/${row.topic_id}`);
  return { error: null };
}

export async function updateSessionClassificationAction(
  sessionId: string,
  subjectId: string,
  topicId: string,
  activityType: string,
  activityTypeCustom: string | null,
): Promise<{ error: string | null }> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase.from("focus_sessions").select("user_id").eq("id", sessionId).single();
  if (!row || row.user_id !== user.id) return { error: "Sessão não encontrada." };

  const { error } = await supabase
    .from("focus_sessions")
    .update({
      subject_id: subjectId,
      topic_id: topicId,
      activity_type: activityType,
      activity_type_custom: activityType === "outro" ? activityTypeCustom : null,
    })
    .eq("id", sessionId);
  if (error) return { error: "Não foi possível salvar a classificação." };

  revalidateFocusPaths();
  return { error: null };
}

export async function deleteFocusSessionAction(sessionId: string): Promise<{ error: string | null }> {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase.from("focus_sessions").select("user_id").eq("id", sessionId).single();
  if (!row || row.user_id !== user.id) return { error: "Sessão não encontrada." };

  const { error } = await supabase.from("focus_sessions").delete().eq("id", sessionId);
  if (error) return { error: "Não foi possível excluir a sessão." };

  revalidateFocusPaths();
  return { error: null };
}

export async function getFocusHistoryAction(filters: FocusHistoryFilters): Promise<FocusHistoryEntry[]> {
  const { user } = await requireUser();
  return getFocusHistory(user.id, filters);
}
