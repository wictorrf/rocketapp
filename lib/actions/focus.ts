"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function startFocusSessionAction(
  subjectId: string,
  topicId: string,
  plannedMinutes: number,
  cyclesPlanned: number,
): Promise<{ sessionId: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("focus_sessions")
    .insert({
      user_id: user.id,
      subject_id: subjectId,
      topic_id: topicId,
      planned_minutes: plannedMinutes,
      cycles_planned: cyclesPlanned,
    })
    .select("id")
    .single();

  if (error || !data) return { sessionId: null, error: "Não foi possível iniciar a sessão." };
  return { sessionId: data.id, error: null };
}

export async function finishFocusSessionAction(
  sessionId: string,
  actualMinutes: number,
  cyclesCompleted: number,
) {
  const supabase = await createClient();
  await supabase
    .from("focus_sessions")
    .update({
      ended_at: new Date().toISOString(),
      actual_minutes: actualMinutes,
      cycles_completed: cyclesCompleted,
    })
    .eq("id", sessionId);

  revalidatePath("/dashboard");
  revalidatePath("/metrics");
}
