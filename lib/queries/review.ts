import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/utils/format";

export type ReviewCard = {
  id: string;
  front: string;
  back: string;
  imageUrl: string | null;
};

// Cartões previstos pra hoje (due_at <= hoje), mais atrasados primeiro —
// é a fila usada pela sessão de revisão ("Iniciar revisão de hoje").
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
