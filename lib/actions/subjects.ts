"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

export async function createSubjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || "📚";
  if (!name) return { error: "Dê um nome pra disciplina." };

  const { error } = await supabase.from("subjects").insert({ user_id: user.id, name, icon });
  if (error) return { error: "Não foi possível criar a disciplina. Tente novamente." };

  revalidatePath("/subjects");
  return { error: null };
}
