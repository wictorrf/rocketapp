"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  checkSubjectNameExists,
  getSubjectDeletionImpact,
  listActiveSubjectsForMove,
} from "@/lib/queries/subjects";
import { DEFAULT_ENTITY_COLOR } from "@/lib/constants/entity-colors";

export type ActionState = { error: string | null };
export type SubjectActionState = ActionState & { duplicate?: { id: string; name: string } | null };

export async function createSubjectAction(
  _prevState: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || DEFAULT_ENTITY_COLOR;
  const period = String(formData.get("period") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const confirmDuplicate = formData.get("confirmDuplicate") === "1";

  if (!name) return { error: "Dê um nome pra disciplina." };

  if (!confirmDuplicate) {
    const existing = await checkSubjectNameExists(user.id, name);
    if (existing) return { error: null, duplicate: existing };
  }

  const { error } = await supabase
    .from("subjects")
    .insert({ user_id: user.id, name, icon, color, period, note });
  if (error) return { error: "Não foi possível criar a disciplina. Tente novamente." };

  revalidatePath("/subjects");
  return { error: null };
}

export async function updateSubjectAction(
  _prevState: SubjectActionState,
  formData: FormData,
): Promise<SubjectActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subjectId = String(formData.get("subjectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || DEFAULT_ENTITY_COLOR;
  const period = String(formData.get("period") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const confirmDuplicate = formData.get("confirmDuplicate") === "1";

  if (!subjectId || !name) return { error: "Dê um nome pra disciplina." };

  if (!confirmDuplicate) {
    const existing = await checkSubjectNameExists(user.id, name, subjectId);
    if (existing) return { error: null, duplicate: existing };
  }

  const { error } = await supabase
    .from("subjects")
    .update({ name, icon, color, period, note })
    .eq("id", subjectId);
  if (error) return { error: "Não foi possível salvar a disciplina. Tente novamente." };

  revalidatePath("/subjects");
  revalidatePath(`/subjects/${subjectId}/topics`);
  return { error: null };
}

export async function archiveSubjectAction(subjectId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("subjects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", subjectId);
  if (error) return { error: "Não foi possível arquivar a disciplina." };

  revalidatePath("/subjects");
  return { error: null };
}

export async function restoreSubjectAction(subjectId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("subjects").update({ archived_at: null }).eq("id", subjectId);
  if (error) return { error: "Não foi possível restaurar a disciplina." };

  revalidatePath("/subjects");
  return { error: null };
}

export async function duplicateSubjectAction(
  subjectId: string,
  copyEmptyTopics: boolean,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: original } = await supabase
    .from("subjects")
    .select("name, icon, color, period, note")
    .eq("id", subjectId)
    .maybeSingle();
  if (!original) return { error: "Disciplina não encontrada." };

  let candidateName = `${original.name} (cópia)`;
  let attempt = 1;
  while (await checkSubjectNameExists(user.id, candidateName)) {
    attempt += 1;
    candidateName = `${original.name} (cópia ${attempt})`;
  }

  const { data: created, error } = await supabase
    .from("subjects")
    .insert({
      user_id: user.id,
      name: candidateName,
      icon: original.icon,
      color: original.color,
      period: original.period,
      note: original.note,
    })
    .select("id")
    .single();
  if (error || !created) return { error: "Não foi possível duplicar a disciplina." };

  if (copyEmptyTopics) {
    const { data: topics } = await supabase
      .from("topics")
      .select("name, emoji, color, note, tags")
      .eq("subject_id", subjectId)
      .is("archived_at", null);
    if (topics?.length) {
      await supabase.from("topics").insert(
        topics.map((t) => ({
          user_id: user.id,
          subject_id: created.id,
          name: t.name,
          emoji: t.emoji,
          color: t.color,
          note: t.note,
          tags: t.tags,
        })),
      );
    }
  }

  revalidatePath("/subjects");
  return { error: null };
}

export async function deleteSubjectAction(
  subjectId: string,
  mode: "archive" | "move" | "delete",
  targetSubjectId?: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (mode === "archive") {
    const { error } = await supabase
      .from("subjects")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", subjectId);
    if (error) return { error: "Não foi possível arquivar a disciplina." };
  } else if (mode === "move") {
    if (!targetSubjectId) return { error: "Escolha a disciplina de destino." };
    const { error: moveError } = await supabase
      .from("topics")
      .update({ subject_id: targetSubjectId })
      .eq("subject_id", subjectId);
    if (moveError) return { error: "Não foi possível mover os assuntos dessa disciplina." };
    const { error: delError } = await supabase.from("subjects").delete().eq("id", subjectId);
    if (delError) return { error: "Não foi possível excluir a disciplina." };
  } else {
    const { error } = await supabase.from("subjects").delete().eq("id", subjectId);
    if (error) return { error: "Não foi possível excluir a disciplina." };
  }

  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function getSubjectDeletionImpactAction(subjectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return getSubjectDeletionImpact(subjectId);
}

export async function listActiveSubjectsForMoveAction(excludeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return listActiveSubjectsForMove(user.id, excludeId);
}

export async function reorderSubjectsAction(orderedSubjectIds: string[]): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const results = await Promise.all(
    orderedSubjectIds.map((subjectId, index) =>
      supabase.from("subjects").update({ sort_order: index }).eq("id", subjectId).eq("user_id", user.id),
    ),
  );
  if (results.some((r) => r.error)) return { error: "Não foi possível salvar a nova ordem." };

  revalidatePath("/subjects");
  return { error: null };
}
