"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

export async function createTopicAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subjectId = String(formData.get("subjectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!subjectId || !name) return { error: "Dê um nome pro assunto." };

  const { error } = await supabase
    .from("topics")
    .insert({ user_id: user.id, subject_id: subjectId, name });
  if (error) return { error: "Não foi possível criar o assunto. Tente novamente." };

  revalidatePath(`/subjects/${subjectId}/topics`);
  return { error: null };
}
