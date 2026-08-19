import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/utils/format";

export type ReviewCard = {
  id: string;
  front: string;
  back: string;
  imageUrl: string | null;
  topicName?: string;
  subjectName?: string;
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Cartões previstos pra hoje (due_at <= hoje), mais atrasados primeiro —
// é a fila usada pela sessão de revisão de um único assunto.
export async function getDueFlashcardsForReview(topicId: string): Promise<ReviewCard[]> {
  const supabase = await createClient();
  const todayKey = toLocalDateKey(new Date());

  const { data } = await supabase
    .from("flashcards")
    .select("id, front, back, image_url, flashcard_srs_state!inner(due_at)")
    .eq("topic_id", topicId)
    .lte("flashcard_srs_state.due_at", todayKey)
    .order("due_at", { referencedTable: "flashcard_srs_state", ascending: true });

  return (data ?? []).map((f) => ({
    id: f.id,
    front: f.front,
    back: f.back,
    imageUrl: f.image_url,
  }));
}

// Fila "revisar tudo misturado" — todos os cartões vencidos da usuária, de
// qualquer disciplina/assunto, embaralhados, cada um com o contexto de onde
// vem (pra aparecer durante a revisão).
export async function getAllDueFlashcardsForUser(userId: string): Promise<ReviewCard[]> {
  const supabase = await createClient();
  const todayKey = toLocalDateKey(new Date());

  const { data } = await supabase
    .from("flashcards")
    .select("id, front, back, image_url, topic_id, flashcard_srs_state!inner(due_at)")
    .eq("user_id", userId)
    .lte("flashcard_srs_state.due_at", todayKey);

  if (!data?.length) return [];

  const topicIds = [...new Set(data.map((f) => f.topic_id))];
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in("id", topicIds);
  const topicById = new Map((topics ?? []).map((t) => [t.id, t]));

  const subjectIds = [...new Set((topics ?? []).map((t) => t.subject_id))];
  const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  const cards: ReviewCard[] = data.map((f) => {
    const topic = topicById.get(f.topic_id);
    return {
      id: f.id,
      front: f.front,
      back: f.back,
      imageUrl: f.image_url,
      topicName: topic?.name,
      subjectName: topic ? subjectNameById.get(topic.subject_id) : undefined,
    };
  });

  return shuffle(cards);
}

export type DueTopicSummary = {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  dueCount: number;
};

// Resumo por assunto dos cartões vencidos — alimenta o hub de Flashcards
// ("revisar cada tema separado").
export async function getDueSummaryByTopic(userId: string): Promise<DueTopicSummary[]> {
  const supabase = await createClient();
  const todayKey = toLocalDateKey(new Date());

  const { data } = await supabase
    .from("flashcards")
    .select("id, topic_id, flashcard_srs_state!inner(due_at)")
    .eq("user_id", userId)
    .lte("flashcard_srs_state.due_at", todayKey);

  if (!data?.length) return [];

  const countByTopic = new Map<string, number>();
  for (const f of data) countByTopic.set(f.topic_id, (countByTopic.get(f.topic_id) ?? 0) + 1);

  const topicIds = [...countByTopic.keys()];
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in("id", topicIds);

  const subjectIds = [...new Set((topics ?? []).map((t) => t.subject_id))];
  const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return (topics ?? [])
    .map((t) => ({
      subjectId: t.subject_id,
      subjectName: subjectNameById.get(t.subject_id) ?? "",
      topicId: t.id,
      topicName: t.name,
      dueCount: countByTopic.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.dueCount - a.dueCount);
}
