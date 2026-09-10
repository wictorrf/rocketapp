import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey, addDaysToKey, dateKeyToUtcDate } from "@/lib/utils/format";
import { WEEKDAY_LABEL_MON_FIRST_PT } from "@/lib/constants/calendar";

// Dias (YYYY-MM-DD, no fuso da usuária) com alguma atividade — Study Time ou
// revisão de flashcard. Fonte única reaproveitada por computeStreak e
// getWeekStudyConsistency, pra nunca divergir entre os dois. v1: busca os
// timestamps e resolve em memória — reavaliar se a base de usuárias crescer
// muito.
async function getActiveDayKeys(userId: string, timeZone: string): Promise<Set<string>> {
  const supabase = await createClient();
  const [{ data: focusRows }, { data: reviewRows }] = await Promise.all([
    supabase.from("focus_sessions").select("started_at").eq("user_id", userId),
    supabase.from("review_logs").select("reviewed_at").eq("user_id", userId),
  ]);

  const activeDays = new Set<string>();
  for (const row of focusRows ?? []) activeDays.add(toLocalDateKey(new Date(row.started_at), timeZone));
  for (const row of reviewRows ?? []) activeDays.add(toLocalDateKey(new Date(row.reviewed_at), timeZone));
  return activeDays;
}

// Sequência de dias seguidos com atividade, contando pra trás a partir de
// hoje (no fuso da usuária).
export async function computeStreak(userId: string, timeZone: string): Promise<number> {
  const activeDays = await getActiveDayKeys(userId, timeZone);
  return currentStreakFrom(activeDays, toLocalDateKey(new Date(), timeZone));
}

function currentStreakFrom(activeDays: Set<string>, todayKey: string): number {
  let streak = 0;
  let cursor = todayKey;
  while (activeDays.has(cursor)) {
    streak++;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}

// Maior sequência de dias consecutivos em todo o histórico de `activeDays`.
function longestStreakFrom(activeDays: Set<string>): number {
  let longest = 0;
  for (const key of activeDays) {
    const hasPrevDay = activeDays.has(addDaysToKey(key, -1));
    if (hasPrevDay) continue; // não é o início de uma sequência
    let run = 1;
    let cursor = key;
    while (activeDays.has(addDaysToKey(cursor, 1))) {
      run++;
      cursor = addDaysToKey(cursor, 1);
    }
    if (run > longest) longest = run;
  }
  return longest;
}

export type WeekStudyConsistency = {
  currentStreak: number;
  longestStreak: number;
  weekActivity: { dateKey: string; weekdayLabel: string; active: boolean }[];
};

// Seção "Constância de estudos" do Dashboard: sequência atual, maior
// sequência já alcançada, e quais dias da semana corrente (segunda a
// domingo) tiveram atividade.
export async function getWeekStudyConsistency(userId: string, timeZone: string): Promise<WeekStudyConsistency> {
  const activeDays = await getActiveDayKeys(userId, timeZone);
  const todayKey = toLocalDateKey(new Date(), timeZone);

  const weekday = dateKeyToUtcDate(todayKey).getUTCDay(); // 0=domingo
  const mondayKey = addDaysToKey(todayKey, -((weekday + 6) % 7));

  const weekActivity = Array.from({ length: 7 }, (_, i) => {
    const dateKey = addDaysToKey(mondayKey, i);
    return {
      dateKey,
      weekdayLabel: WEEKDAY_LABEL_MON_FIRST_PT[i],
      active: activeDays.has(dateKey),
    };
  });

  return {
    currentStreak: currentStreakFrom(activeDays, todayKey),
    longestStreak: longestStreakFrom(activeDays),
    weekActivity,
  };
}
