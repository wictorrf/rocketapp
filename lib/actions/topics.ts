"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  checkTopicNameExists,
  getTopicDeletionImpact,
  listOtherActiveTopicsForUser,
} from "@/lib/queries/topics";

export type ActionState = { error: string | null };
export type TopicActionState = ActionState & { duplicate?: { id: string; name: string } | null };

function parseTags(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createTopicAction(
  _prevState: TopicActionState,
  formData: FormData,
): Promise<TopicActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subjectId = String(formData.get("subjectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const tags = parseTags(formData.get("tags"));
  const confirmDuplicate = formData.get("confirmDuplicate") === "1";

  if (!subjectId || !name) return { error: "Dê um nome pro assunto." };

  if (!confirmDuplicate) {
    const existing = await checkTopicNameExists(subjectId, name);
    if (existing) return { error: null, duplicate: existing };
  }

  const { error } = await supabase
    .from("topics")
    .insert({ user_id: user.id, subject_id: subjectId, name, emoji, color, note, tags });
  if (error) return { error: "Não foi possível criar o assunto. Tente novamente." };

  revalidatePath(`/subjects/${subjectId}/topics`);
  revalidatePath("/subjects");
  return { error: null };
}

export async function updateTopicAction(
  _prevState: TopicActionState,
  formData: FormData,
): Promise<TopicActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const topicId = String(formData.get("topicId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const tags = parseTags(formData.get("tags"));
  const confirmDuplicate = formData.get("confirmDuplicate") === "1";

  if (!topicId || !name) return { error: "Dê um nome pro assunto." };

  if (!confirmDuplicate) {
    const existing = await checkTopicNameExists(subjectId, name, topicId);
    if (existing) return { error: null, duplicate: existing };
  }

  const { error } = await supabase
    .from("topics")
    .update({ name, emoji, color, note, tags })
    .eq("id", topicId);
  if (error) return { error: "Não foi possível salvar o assunto. Tente novamente." };

  revalidatePath(`/subjects/${subjectId}/topics`);
  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  return { error: null };
}

export async function archiveTopicAction(topicId: string, subjectId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("topics")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", topicId);
  if (error) return { error: "Não foi possível arquivar o assunto." };

  revalidatePath(`/subjects/${subjectId}/topics`);
  return { error: null };
}

export async function restoreTopicAction(topicId: string, subjectId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("topics").update({ archived_at: null }).eq("id", topicId);
  if (error) return { error: "Não foi possível restaurar o assunto." };

  revalidatePath(`/subjects/${subjectId}/topics`);
  return { error: null };
}

export async function duplicateTopicAction(
  topicId: string,
  subjectId: string,
  copyFlashcards: boolean,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: original } = await supabase
    .from("topics")
    .select("name, emoji, color, note, tags")
    .eq("id", topicId)
    .maybeSingle();
  if (!original) return { error: "Assunto não encontrado." };

  let candidateName = `${original.name} (cópia)`;
  let attempt = 1;
  while (await checkTopicNameExists(subjectId, candidateName)) {
    attempt += 1;
    candidateName = `${original.name} (cópia ${attempt})`;
  }

  const { data: created, error } = await supabase
    .from("topics")
    .insert({
      user_id: user.id,
      subject_id: subjectId,
      name: candidateName,
      emoji: original.emoji,
      color: original.color,
      note: original.note,
      tags: original.tags,
    })
    .select("id")
    .single();
  if (error || !created) return { error: "Não foi possível duplicar o assunto." };

  if (copyFlashcards) {
    const { data: flashcards } = await supabase
      .from("flashcards")
      .select("front, back, image_url")
      .eq("topic_id", topicId);
    if (flashcards?.length) {
      await supabase.from("flashcards").insert(
        flashcards.map((f) => ({
          user_id: user.id,
          topic_id: created.id,
          front: f.front,
          back: f.back,
          image_url: f.image_url,
        })),
      );
    }
  }

  revalidatePath(`/subjects/${subjectId}/topics`);
  return { error: null };
}

export async function moveTopicAction(
  topicId: string,
  targetSubjectId: string,
  renameTo?: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: topic } = await supabase
    .from("topics")
    .select("subject_id")
    .eq("id", topicId)
    .maybeSingle();
  if (!topic) return { error: "Assunto não encontrado." };

  const updatePayload: { subject_id: string; name?: string } = { subject_id: targetSubjectId };
  if (renameTo?.trim()) updatePayload.name = renameTo.trim();

  const { error } = await supabase.from("topics").update(updatePayload).eq("id", topicId);
  if (error) return { error: "Não foi possível mover o assunto." };

  revalidatePath(`/subjects/${topic.subject_id}/topics`);
  revalidatePath(`/subjects/${targetSubjectId}/topics`);
  return { error: null };
}

export async function deleteTopicAction(
  topicId: string,
  subjectId: string,
  mode: "archive" | "move" | "delete",
  targetTopicId?: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (mode === "archive") {
    const { error } = await supabase
      .from("topics")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", topicId);
    if (error) return { error: "Não foi possível arquivar o assunto." };
  } else if (mode === "move") {
    if (!targetTopicId) return { error: "Escolha o assunto de destino." };
    const { error: moveFlashcardsError } = await supabase
      .from("flashcards")
      .update({ topic_id: targetTopicId })
      .eq("topic_id", topicId);
    if (moveFlashcardsError) return { error: "Não foi possível mover os flashcards." };
    const { error: moveQuestionsError } = await supabase
      .from("question_logs")
      .update({ topic_id: targetTopicId })
      .eq("topic_id", topicId);
    if (moveQuestionsError) return { error: "Não foi possível mover os registros de questões." };
    const { error: delError } = await supabase.from("topics").delete().eq("id", topicId);
    if (delError) return { error: "Não foi possível excluir o assunto." };
  } else {
    const { error } = await supabase.from("topics").delete().eq("id", topicId);
    if (error) return { error: "Não foi possível excluir o assunto." };
  }

  revalidatePath(`/subjects/${subjectId}/topics`);
  revalidatePath("/subjects");
  return { error: null };
}

export async function getTopicDeletionImpactAction(topicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return getTopicDeletionImpact(topicId);
}

export async function listOtherActiveTopicsAction(excludeTopicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return listOtherActiveTopicsForUser(user.id, excludeTopicId);
}

export async function checkTopicNameInSubjectAction(subjectId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return checkTopicNameExists(subjectId, name);
}

