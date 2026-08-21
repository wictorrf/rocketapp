"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/utils/format";
import { TASK_TYPE_OPTIONS } from "@/lib/constants/calendar";
import { MAX_PILLARS } from "@/lib/constants/pillars";
import type { MonthlyPlanGoals } from "@/lib/queries/calendar";

export type ActionState = { error: string | null };

const RECURRENCE_WEEKS = 13; // ~3 meses de ocorrências semanais materializadas

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
  const color = String(formData.get("color") ?? "").trim() || null;
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const recurring = formData.get("recurring") === "on";

  if (!TASK_TYPE_OPTIONS.some((o) => o.value === type)) return { error: "Tipo de evento inválido." };
  if (!title || !scheduledDate) return { error: "Preencha o título e a data." };

  const baseRow = {
    user_id: user.id,
    type,
    title,
    scheduled_time: scheduledTime,
    source: "manual" as const,
    color,
    emoji,
    location,
    notes,
  };

  if (!recurring) {
    const { error } = await supabase
      .from("calendar_tasks")
      .insert({ ...baseRow, scheduled_date: scheduledDate });
    if (error) return { error: "Não foi possível criar o evento. Tente novamente." };
  } else {
    const groupId = crypto.randomUUID();
    const rows = [];
    const cursor = new Date(`${scheduledDate}T00:00:00`);
    for (let i = 0; i < RECURRENCE_WEEKS; i++) {
      rows.push({
        ...baseRow,
        scheduled_date: toLocalDateKey(cursor),
        recurrence_group_id: groupId,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
    const { error } = await supabase.from("calendar_tasks").insert(rows);
    if (error) return { error: "Não foi possível criar o evento recorrente. Tente novamente." };
  }

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
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
  const selectedPillars = String(formData.get("selectedPillars") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, MAX_PILLARS);

  if (!month || !mission) return { error: "Escreva a missão do mês." };
  if (selectedPillars.length === 0) return { error: "Escolha pelo menos um pilar do mês." };

  const pillars = selectedPillars.map((key) => ({
    key,
    purpose: String(formData.get(`purpose_${key}`) ?? "").trim(),
    objectives: String(formData.get(`objectives_${key}`) ?? "")
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean),
  }));

  const mainGoals = selectedPillars.map((key) => ({
    pillarKey: key,
    text: String(formData.get(`mainGoal_${key}`) ?? "").trim(),
  }));

  const goals: MonthlyPlanGoals = { mission, pillars, mainGoals, review: null };

  const { error } = await supabase
    .from("monthly_plans")
    .upsert(
      { user_id: user.id, month, goals, completed_at: new Date().toISOString() },
      { onConflict: "user_id,month" },
    );
  if (error) return { error: "Não foi possível salvar o planejamento. Tente novamente." };

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function saveMonthlyReviewAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const month = String(formData.get("month") ?? "");
  const review = String(formData.get("review") ?? "").trim();
  if (!month || !review) return { error: "Escreva sua revisão do mês." };

  const { data: existing } = await supabase
    .from("monthly_plans")
    .select("goals")
    .eq("user_id", user.id)
    .eq("month", month)
    .maybeSingle();
  if (!existing) return { error: "Planeje o mês antes de fazer a revisão." };

  const goals = { ...(existing.goals as MonthlyPlanGoals), review };

  const { error } = await supabase
    .from("monthly_plans")
    .update({ goals, reviewed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("month", month);
  if (error) return { error: "Não foi possível salvar a revisão. Tente novamente." };

  revalidatePath("/calendar");
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

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}
