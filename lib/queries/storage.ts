import { createClient } from "@/lib/supabase/server";

// Buckets são privados — a UI sempre recebe uma signed URL de curta duração,
// nunca a URL pública direta.
export async function getSignedUrl(
  bucket: "avatars" | "flashcard-images",
  path: string | null | undefined,
  expiresInSeconds = 3600,
) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  return data?.signedUrl ?? null;
}

// Versão em lote — evita N idas ao Storage ao renderizar uma lista de flashcards com imagem.
export async function getSignedUrls(
  bucket: "avatars" | "flashcard-images",
  paths: string[],
  expiresInSeconds = 3600,
): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresInSeconds);
  const map = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) map.set(item.path, item.signedUrl);
  }
  return map;
}
