import { createClient } from "@/lib/supabase/server";
import { htmlToPlainText } from "@/lib/utils/sanitize-html";

export type FlashcardForEdit = {
  id: string;
  topicId: string;
  subjectId: string;
  front: string;
  back: string;
  tags: string[];
  imageUrl: string | null;
  imageAlt: string | null;
  backImageUrl: string | null;
  backImageAlt: string | null;
};

export async function getFlashcardForEdit(flashcardId: string): Promise<FlashcardForEdit | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("flashcards")
    .select("id, topic_id, front, back, tags, image_url, image_alt, back_image_url, back_image_alt, topics(subject_id)")
    .eq("id", flashcardId)
    .maybeSingle();
  if (!data) return null;
  const topic = Array.isArray(data.topics) ? data.topics[0] : data.topics;
  return {
    id: data.id,
    topicId: data.topic_id,
    subjectId: topic?.subject_id ?? "",
    front: data.front,
    back: data.back,
    tags: (data.tags as string[] | null) ?? [],
    imageUrl: data.image_url,
    imageAlt: data.image_alt,
    backImageUrl: data.back_image_url,
    backImageAlt: data.back_image_alt,
  };
}

// Duplicidade "possível": mesma frente (comparando o texto puro, sem
// formatação) dentro do mesmo assunto. Comparação exata após normalização
// — não é uma busca por semelhança difusa, mas cobre o caso comum de
// recriar a mesma pergunta sem querer.
export async function checkPossibleDuplicate(
  topicId: string,
  frontHtml: string,
  excludeId?: string,
): Promise<{ id: string; frontPreview: string } | null> {
  const normalizedNew = htmlToPlainText(frontHtml).toLowerCase();
  if (!normalizedNew) return null;

  const supabase = await createClient();
  let query = supabase.from("flashcards").select("id, front").eq("topic_id", topicId);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;

  const match = (data ?? []).find((f) => htmlToPlainText(f.front).toLowerCase() === normalizedNew);
  return match ? { id: match.id, frontPreview: htmlToPlainText(match.front) } : null;
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Busca por conteúdo (pergunta, resposta, etiquetas) — usada pela página
// geral de Flashcards, que não carrega o conteúdo de todos os cartões de
// uma vez (só disciplina/assunto). Devolve os assuntos que têm pelo menos
// um cartão correspondente, pra filtrar a lista já carregada de assuntos.
export async function searchFlashcardsByContent(userId: string, query: string): Promise<string[]> {
  const needle = normalize(query.trim());
  if (!needle) return [];

  const supabase = await createClient();
  const { data } = await supabase.from("flashcards").select("topic_id, front, back, tags").eq("user_id", userId);

  const topicIds = new Set<string>();
  for (const f of data ?? []) {
    const haystack = [htmlToPlainText(f.front), htmlToPlainText(f.back), ...((f.tags as string[] | null) ?? [])];
    if (haystack.some((v) => normalize(v).includes(needle))) topicIds.add(f.topic_id);
  }
  return [...topicIds];
}

export type MoveTargetTopic = { id: string; label: string };

// Lista achatada "Disciplina — Assunto" pra mover um flashcard direto pro
// destino final, sem precisar de um seletor em cascata disciplina→assunto.
export async function listActiveTopicsForFlashcardMove(
  userId: string,
  excludeTopicId: string,
): Promise<MoveTargetTopic[]> {
  const supabase = await createClient();
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .eq("user_id", userId)
    .is("archived_at", null)
    .neq("id", excludeTopicId)
    .order("name");
  if (!topics?.length) return [];

  const subjectIds = [...new Set(topics.map((t) => t.subject_id))];
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .in("id", subjectIds)
    .is("archived_at", null);
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return topics
    .filter((t) => subjectNameById.has(t.subject_id))
    .map((t) => ({ id: t.id, label: `${subjectNameById.get(t.subject_id)} — ${t.name}` }));
}
