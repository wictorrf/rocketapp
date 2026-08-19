"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

export async function createCalendarTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const type = String(formData.get("type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const scheduledDate = String(formData.get("scheduledDate") ?? "");
  const scheduledTime = String(formData.get("scheduledTime") ?? "").trim() || null;

  if (!["prova", "contato"].includes(type)) return { error: "Tipo de tarefa inválido." };
  if (!title || !scheduledDate) return { error: "Preencha o título e a data." };

  const { error } = await supabase.from("calendar_tasks").insert({
    user_id: user.id,
    type,
    title,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    source: "manual",
  });
  if (error) return { error: "Não foi possível criar a tarefa. Tente novamente." };

  revalidatePath("/calendar");
  revalidatePath("/home");
  return { error: null };
}

export async function saveMonthlyPlanAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const month = String(formData.get("month") ?? ""); // YYYY-MM-01
  const mission = String(formData.get("mission") ?? "").trim();
  if (!month || !mission) return { error: "Escreva a missão do mês." };

  const { error } = await supabase
    .from("monthly_plans")
    .upsert(
      { user_id: user.id, month, goals: { mission }, completed_at: new Date().toISOString() },
      { onConflict: "user_id,month" },
    );
  if (error) return { error: "Não foi possível salvar o planejamento. Tente novamente." };

  revalidatePath("/calendar");
  revalidatePath("/home");
  return { error: null };
}

export async function toggleTaskStatusAction(taskId: string, done: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("calendar_tasks")
    .update({ status: done ? "done" : "pending" })
    .eq("id", taskId)
    .eq("user_id", user.id);

  revalidatePath("/home");
  revalidatePath("/calendar");
}
