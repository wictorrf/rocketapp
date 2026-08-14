"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

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

  if (!topicId || !questionsDone || questionsDone <= 0) {
    return { error: "Informe quantas questões você fez." };
  }
  if (questionsCorrect < 0 || questionsCorrect > questionsDone) {
    return { error: "O número de acertos não pode ser maior que o de questões feitas." };
  }

  const { error } = await supabase.from("question_logs").insert({
    user_id: user.id,
    topic_id: topicId,
    questions_done: questionsDone,
    questions_correct: questionsCorrect,
    note,
  });
  if (error) return { error: "Não foi possível salvar o registro. Tente novamente." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  return { error: null };
}
