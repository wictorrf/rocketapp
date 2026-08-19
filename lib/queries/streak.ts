import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/utils/format";

function toDateKey(iso: string) {
  return toLocalDateKey(new Date(iso));
}

// Sequência de dias seguidos com alguma atividade (Study Time ou revisão de
// flashcard), contando pra trás a partir de hoje. v1: busca os timestamps e
// resolve em memória — reavaliar se a base de usuárias crescer muito.
export async function computeStreak(userId: string): Promise<number> {
  const supabase = await createClient();
  const [{ data: focusRows }, { data: reviewRows }] = await Promise.all([
    supabase.from("focus_sessions").select("started_at").eq("user_id", userId),
    supabase.from("review_logs").select("reviewed_at").eq("user_id", userId),
  ]);

  const activeDays = new Set<string>();
  for (const row of focusRows ?? []) activeDays.add(toDateKey(row.started_at));
  for (const row of reviewRows ?? []) activeDays.add(toDateKey(row.reviewed_at));

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (activeDays.has(toLocalDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
