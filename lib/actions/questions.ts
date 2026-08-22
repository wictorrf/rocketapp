"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

const VALID_LOG_TYPES = ["questoes", "simulado_externo", "prova_antiga", "outro"];

function parseLogType(raw: FormDataEntryValue | null): string {
  const value = String(raw ?? "questoes");
  return VALID_LOG_TYPES.includes(value) ? value : "questoes";
}

export async function logQuestionsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subjectId = String(formData.get("subjectId") ?? "");
  const topicId = String(formData.get("topicId") ?? "");
  const questionsDone = Number(formData.get("questionsDone"));
  const questionsCorrect = Number(formData.get("questionsCorrect"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const loggedAtDate = String(formData.get("loggedAt") ?? "").trim();
  const logType = parseLogType(formData.get("logType"));
  const logTypeCustom = logType === "outro" ? String(formData.get("logTypeCustom") ?? "").trim() || null : null;

  if (!topicId || !questionsDone || questionsDone <= 0) {
    return { error: "Informe quantas questões você fez." };
  }
  if (questionsCorrect < 0 || questionsCorrect > questionsDone) {
    return { error: "O número de acertos não pode ser maior que o de questões feitas." };
  }
  if (logType === "outro" && !logTypeCustom) {
    return { error: "Escreva a classificação do tipo Outro." };
  }

  const { error } = await supabase.from("question_logs").insert({
    user_id: user.id,
    topic_id: topicId,
    questions_done: questionsDone,
    questions_correct: questionsCorrect,
    note,
    logged_at: loggedAtDate ? `${loggedAtDate}T12:00:00.000Z` : new Date().toISOString(),
    log_type: logType,
    log_type_custom: logTypeCustom,
  });
  if (error) return { error: "Não foi possível salvar o registro. Tente novamente." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function updateQuestionLogAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const logId = String(formData.get("logId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const topicId = String(formData.get("topicId") ?? "");
  const questionsDone = Number(formData.get("questionsDone"));
  const questionsCorrect = Number(formData.get("questionsCorrect"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const loggedAtDate = String(formData.get("loggedAt") ?? "").trim();
  const logType = parseLogType(formData.get("logType"));
  const logTypeCustom = logType === "outro" ? String(formData.get("logTypeCustom") ?? "").trim() || null : null;

  if (!logId || !questionsDone || questionsDone <= 0) {
    return { error: "Informe quantas questões você fez." };
  }
  if (questionsCorrect < 0 || questionsCorrect > questionsDone) {
    return { error: "O número de acertos não pode ser maior que o de questões feitas." };
  }
  if (logType === "outro" && !logTypeCustom) {
    return { error: "Escreva a classificação do tipo Outro." };
  }

  const { error } = await supabase
    .from("question_logs")
    .update({
      questions_done: questionsDone,
      questions_correct: questionsCorrect,
      note,
      ...(loggedAtDate ? { logged_at: `${loggedAtDate}T12:00:00.000Z` } : {}),
      log_type: logType,
      log_type_custom: logTypeCustom,
    })
    .eq("id", logId);
  if (error) return { error: "Não foi possível salvar o registro. Tente novamente." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteQuestionLogAction(
  logId: string,
  subjectId: string,
  topicId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("question_logs").delete().eq("id", logId);
  if (error) return { error: "Não foi possível excluir o registro." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath("/dashboard");
  return { error: null };
}
