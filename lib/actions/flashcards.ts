"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

export async function createFlashcardAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subjectId = String(formData.get("subjectId") ?? "");
  const topicId = String(formData.get("topicId") ?? "");
  const front = String(formData.get("front") ?? "").trim();
  const back = String(formData.get("back") ?? "").trim();
  const image = formData.get("image");

  if (!subjectId || !topicId || !front || !back) {
    return { error: "Preencha a frente e o verso do cartão." };
  }

  let imagePath: string | undefined;
  if (image instanceof File && image.size > 0) {
    const ext = image.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("flashcard-images")
      .upload(path, image, { contentType: image.type });
    if (uploadError) return { error: "Não foi possível enviar a imagem. Tente novamente." };
    imagePath = path;
  }

  const { error } = await supabase.from("flashcards").insert({
    user_id: user.id,
    topic_id: topicId,
    front,
    back,
    image_url: imagePath ?? null,
  });
  if (error) return { error: "Não foi possível salvar o flashcard. Tente novamente." };

  revalidatePath(`/subjects/${subjectId}/topics/${topicId}`);
  redirect(`/subjects/${subjectId}/topics/${topicId}`);
}
