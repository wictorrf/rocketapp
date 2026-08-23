"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFlashcardHtml, htmlToPlainText } from "@/lib/utils/sanitize-html";
import { checkPossibleDuplicate, listActiveTopicsForFlashcardMove, searchFlashcardsByContent } from "@/lib/queries/flashcards";
import { resetProgress } from "@/lib/srs/fsrs";

export type ActionState = { error: string | null };
export type FlashcardActionState = ActionState & { duplicate?: { id: string; frontPreview: string } | null };

function parseTags(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function uploadFlashcardImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: FormDataEntryValue | null,
): Promise<{ path?: string; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return {};
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("flashcard-images")
    .upload(path, file, { contentType: file.type });
  if (error) return { error: "Não foi possível enviar a imagem. Tente novamente." };
  return { path };
}

export async function createFlashcardAction(
  _prevState: FlashcardActionState,
  formData: FormData,
): Promise<FlashcardActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subjectId = String(formData.get("subjectId") ?? "");
  const topicId = String(formData.get("topicId") ?? "");
  const front = sanitizeFlashcardHtml(String(formData.get("front") ?? ""));
  const back = sanitizeFlashcardHtml(String(formData.get("back") ?? ""));
  const tags = parseTags(formData.get("tags"));
  const imageAlt = String(formData.get("imageAlt") ?? "").trim() || null;
  const backImageAlt = String(formData.get("backImageAlt") ?? "").trim() || null;
  const confirmDuplicate = formData.get("confirmDuplicate") === "1";

  if (!subjectId || !topicId || !htmlToPlainText(front) || !htmlToPlainText(back)) {
    return { error: "Escolha disciplina e assunto, e preencha a frente e o verso do cartão." };
  }

  if (!confirmDuplicate) {
    const existing = await checkPossibleDuplicate(topicId, front);
    if (existing) return { error: null, duplicate: existing };
  }

  const [image, backImage] = await Promise.all([
    uploadFlashcardImage(supabase, user.id, formData.get("image")),
    uploadFlashcardImage(supabase, user.id, formData.get("backImage")),
  ]);
  if (image.error) return { error: image.error };
  if (backImage.error) return { error: backImage.error };

  const { error } = await supabase.from("flashcards").insert({
    user_id: user.id,
    topic_id: topicId,
    front,
    back,
    tags,
    image_url: image.path ?? null,
    image_alt: image.path ? imageAlt : null,
    back_image_url: backImage.path ?? null,
    back_image_alt: backImage.path ? backImageAlt : null,
  });
  if (error) return { error: "Não foi possível salvar o flashcard. Tente novamente." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath("/flashcards");
  return { error: null };
}

export async function updateFlashcardAction(
  _prevState: FlashcardActionState,
  formData: FormData,
): Promise<FlashcardActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const flashcardId = String(formData.get("flashcardId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const topicId = String(formData.get("topicId") ?? "");
  const front = sanitizeFlashcardHtml(String(formData.get("front") ?? ""));
  const back = sanitizeFlashcardHtml(String(formData.get("back") ?? ""));
  const tags = parseTags(formData.get("tags"));
  const imageAlt = String(formData.get("imageAlt") ?? "").trim() || null;
  const backImageAlt = String(formData.get("backImageAlt") ?? "").trim() || null;
  const removeImage = formData.get("removeImage") === "1";
  const removeBackImage = formData.get("removeBackImage") === "1";

  if (!flashcardId || !subjectId || !topicId || !htmlToPlainText(front) || !htmlToPlainText(back)) {
    return { error: "Escolha disciplina e assunto, e preencha a frente e o verso do cartão." };
  }

  const { data: current } = await supabase
    .from("flashcards")
    .select("topic_id")
    .eq("id", flashcardId)
    .maybeSingle();
  if (!current) return { error: "Flashcard não encontrado." };

  // Disciplina/assunto agora são campos editáveis no mesmo formulário (não
  // só a ação separada "Mover") — se o assunto de destino mudou, valida que
  // ele não está arquivado, igual moveFlashcardAction já fazia.
  if (topicId !== current.topic_id) {
    const { data: target } = await supabase.from("topics").select("id, archived_at").eq("id", topicId).maybeSingle();
    if (!target || target.archived_at) return { error: "O assunto de destino não está disponível." };
  }

  const [image, backImage] = await Promise.all([
    uploadFlashcardImage(supabase, user.id, formData.get("image")),
    uploadFlashcardImage(supabase, user.id, formData.get("backImage")),
  ]);
  if (image.error) return { error: image.error };
  if (backImage.error) return { error: backImage.error };

  const update: Record<string, unknown> = { front, back, tags, topic_id: topicId };
  if (image.path) {
    update.image_url = image.path;
    update.image_alt = imageAlt;
  } else if (removeImage) {
    update.image_url = null;
    update.image_alt = null;
  } else {
    // Imagem não mudou nesta submissão, mas o texto alternativo pode ter
    // sido editado independentemente dela.
    update.image_alt = imageAlt;
  }
  if (backImage.path) {
    update.back_image_url = backImage.path;
    update.back_image_alt = backImageAlt;
  } else if (removeBackImage) {
    update.back_image_url = null;
    update.back_image_alt = null;
  } else {
    update.back_image_alt = backImageAlt;
  }

  // Editar conteúdo, formatação, imagens ou até disciplina/assunto preserva
  // o identificador, o histórico e o estado do FSRS — só "Reiniciar
  // progresso" (ação separada e reforçada) reinicia o agendamento.
  const { error } = await supabase.from("flashcards").update(update).eq("id", flashcardId);
  if (error) return { error: "Não foi possível salvar o flashcard. Tente novamente." };

  revalidatePath(`/subjects/${subjectId}/topics/${current.topic_id}`);
  if (topicId !== current.topic_id) revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath("/flashcards");
  return { error: null };
}

export async function duplicateFlashcardAction(
  flashcardId: string,
  subjectId: string,
  topicId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: original } = await supabase
    .from("flashcards")
    .select("front, back, tags, image_url, image_alt, back_image_url, back_image_alt, topic_id")
    .eq("id", flashcardId)
    .maybeSingle();
  if (!original) return { error: "Flashcard não encontrado." };

  // Duplicar cria conteúdo novo com identificador e estado Novo — histórico
  // e agendamento do cartão original não são copiados.
  const { error } = await supabase.from("flashcards").insert({
    user_id: user.id,
    topic_id: original.topic_id,
    front: original.front,
    back: original.back,
    tags: original.tags,
    image_url: original.image_url,
    image_alt: original.image_alt,
    back_image_url: original.back_image_url,
    back_image_alt: original.back_image_alt,
  });
  if (error) return { error: "Não foi possível duplicar o flashcard." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath("/flashcards");
  return { error: null };
}

export async function moveFlashcardAction(
  flashcardId: string,
  subjectId: string,
  topicId: string,
  targetTopicId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!targetTopicId) return { error: "Escolha o assunto de destino." };

  const { data: target } = await supabase
    .from("topics")
    .select("id, archived_at")
    .eq("id", targetTopicId)
    .maybeSingle();
  if (!target || target.archived_at) return { error: "O assunto de destino não está disponível." };

  // Mover preserva identificador, histórico, dificuldade, estabilidade e
  // próxima revisão — não reinicia o FSRS nem cria uma revisão nova.
  const { error } = await supabase
    .from("flashcards")
    .update({ topic_id: targetTopicId })
    .eq("id", flashcardId);
  if (error) return { error: "Não foi possível mover o flashcard." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath(`/subjects/${subjectId}/topics/${targetTopicId}`);
  revalidatePath("/flashcards");
  return { error: null };
}

export async function suspendFlashcardAction(
  flashcardId: string,
  subjectId: string,
  topicId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("flashcard_srs_state")
    .update({ suspended_at: new Date().toISOString() })
    .eq("flashcard_id", flashcardId);
  if (error) return { error: "Não foi possível suspender o flashcard." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath("/flashcards");
  return { error: null };
}

export async function reactivateFlashcardAction(
  flashcardId: string,
  subjectId: string,
  topicId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("flashcard_srs_state")
    .update({ suspended_at: null })
    .eq("flashcard_id", flashcardId);
  if (error) return { error: "Não foi possível reativar o flashcard." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath("/flashcards");
  return { error: null };
}

// Ação separada e reforçada: o cartão volta ao estado Novo e recebe um
// agendamento novo. O histórico anterior em review_logs não é apagado.
export async function resetFlashcardProgressAction(
  flashcardId: string,
  subjectId: string,
  topicId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const fresh = resetProgress(now);

  const { error } = await supabase
    .from("flashcard_srs_state")
    .update({
      state: fresh.state,
      due_at: fresh.dueAt,
      stability: fresh.stability,
      difficulty: fresh.difficulty,
      elapsed_days: fresh.elapsedDays,
      scheduled_days: fresh.scheduledDays,
      learning_steps: fresh.learningSteps,
      reps: fresh.reps,
      lapses: fresh.lapses,
      last_review_at: null,
      reset_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("flashcard_id", flashcardId);
  if (error) return { error: "Não foi possível reiniciar o progresso desse flashcard." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath("/flashcards");
  return { error: null };
}

export async function listActiveTopicsForFlashcardMoveAction(excludeTopicId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return listActiveTopicsForFlashcardMove(user.id, excludeTopicId);
}

export async function deleteFlashcardAction(
  flashcardId: string,
  subjectId: string,
  topicId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("flashcards").delete().eq("id", flashcardId);
  if (error) return { error: "Não foi possível excluir o flashcard." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  revalidatePath("/flashcards");
  return { error: null };
}

export async function searchFlashcardsByContentAction(query: string): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return searchFlashcardsByContent(user.id, query);
}
