"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

const VALID_TYPES = ["primeiro_contato", "revisao", "questoes", "outro"] as const;
type StudySessionType = (typeof VALID_TYPES)[number];

function parseType(raw: FormDataEntryValue | null): StudySessionType {
  const value = String(raw ?? "");
  return (VALID_TYPES as readonly string[]).includes(value) ? (value as StudySessionType) : "outro";
}

// Registro manual/retroativo de uma sessão de estudo — mesmo padrão de
// registerSimuladoResultAction (lib/actions/focus.ts): grava em
// question_logs quando há questões e linka via focus_sessions.question_log_id,
// pra alimentar tempo de estudo, questões/aproveitamento, disciplina/assunto
// e constância a partir de uma única fonte, sem duplicar nada.
export async function logStudySessionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const type = parseType(formData.get("type"));
  const hours = Number(formData.get("hours") ?? 0);
  const minutes = Number(formData.get("minutes") ?? 0);
  const totalMinutes = Math.round((Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0));
  const dateKey = String(formData.get("date") ?? "").trim();
  const linked = formData.get("linked") === "yes";
  const subjectId = linked ? String(formData.get("subjectId") ?? "").trim() || null : null;
  const topicId = linked ? String(formData.get("topicId") ?? "").trim() || null : null;
  const questionsDone = Number(formData.get("questionsDone") ?? 0);
  const questionsCorrect = Number(formData.get("questionsCorrect") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;

  if (!dateKey) return { error: "Informe a data da sessão." };
  if (totalMinutes <= 0) return { error: "Informe quanto tempo você estudou." };

  // Questões sempre precisa de disciplina/assunto — question_logs.topic_id
  // é obrigatório no banco, e é assim em todo o resto do Rocket (ver
  // QuestionLogQuickEntry), então mantemos a mesma regra aqui.
  if (type === "questoes") {
    if (!subjectId || !topicId) return { error: "Pra sessões de Questões, selecione a disciplina e o assunto." };
    if (!questionsDone || questionsDone <= 0) return { error: "Informe quantas questões você respondeu." };
    if (questionsCorrect < 0 || questionsCorrect > questionsDone) {
      return { error: "Os acertos não podem ultrapassar o total de questões respondidas." };
    }
  }

  let questionLogId: string | null = null;
  if (type === "questoes") {
    const { data: log, error } = await supabase
      .from("question_logs")
      .insert({
        user_id: user.id,
        topic_id: topicId,
        questions_done: Math.round(questionsDone),
        questions_correct: Math.round(questionsCorrect),
        logged_at: `${dateKey}T12:00:00.000Z`,
        log_type: "questoes",
      })
      .select("id")
      .single();
    if (error || !log) return { error: "Não foi possível registrar as questões da sessão." };
    questionLogId = log.id;
  }

  const startedAt = `${dateKey}T12:00:00.000Z`;
  const endedAt = new Date(new Date(startedAt).getTime() + totalMinutes * 60_000).toISOString();

  const { error } = await supabase.from("focus_sessions").insert({
    user_id: user.id,
    subject_id: subjectId,
    topic_id: topicId,
    activity_type: type,
    mode: "manual",
    status: "finished",
    started_at: startedAt,
    ended_at: endedAt,
    actual_minutes: totalMinutes,
    net_seconds: totalMinutes * 60,
    question_log_id: questionLogId,
    notes,
    idempotency_key: idempotencyKey,
  });
  // Violação de unicidade em idempotency_key = essa exata submissão (duplo
  // clique, retry de rede) já foi gravada antes — trata como sucesso em vez
  // de duplicar ou mostrar erro.
  if (error && error.code !== "23505") return { error: "Não foi possível registrar a sessão de estudo." };

  revalidatePath("/dashboard");
  revalidatePath("/metrics");
  revalidatePath("/focus/history");
  if (subjectId && topicId) revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  return { error: null };
}
