import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/utils/format";

const WEEKDAY_LETTERS_PT = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg..Dom

export type PriorityTask = {
  subjectId: string;
  topicId: string;
  topicName: string;
  subjectName: string;
  cardCount: number;
  estimatedMinutes: number;
};

// Entre os flashcards previstos pra hoje, agrupa por assunto e prioriza o
// assunto com pior desempenho recente (histórico dos próprios cartões
// devidos), desempatando pelo mais atrasado.
export async function getPriorityTask(userId: string): Promise<PriorityTask | null> {
  const supabase = await createClient();
  const todayKey = toLocalDateKey(new Date());

  const { data: due } = await supabase
    .from("flashcards")
    .select("id, topic_id, flashcard_srs_state!inner(due_at)")
    .eq("user_id", userId)
    .lte("flashcard_srs_state.due_at", todayKey);

  if (!due?.length) return null;

  const topicIds = [...new Set(due.map((d) => d.topic_id))];
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in("id", topicIds);
  const topicById = new Map((topics ?? []).map((t) => [t.id, t]));

  const subjectIds = [...new Set((topics ?? []).map((t) => t.subject_id))];
  const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  const flashcardToTopic = new Map(due.map((d) => [d.id, d.topic_id]));
  const dueAtByFlashcard = new Map(
    due.map((d) => {
      const srs = Array.isArray(d.flashcard_srs_state) ? d.flashcard_srs_state[0] : d.flashcard_srs_state;
      return [d.id, srs?.due_at ?? todayKey];
    }),
  );

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const dueFlashcardIds = due.map((d) => d.id);
  const { data: logs } = await supabase
    .from("review_logs")
    .select("flashcard_id, grade")
    .in("flashcard_id", dueFlashcardIds)
    .gte("reviewed_at", fourteenDaysAgo.toISOString());

  const topicStats = new Map<
    string,
    { count: number; oldestDueAt: string; remembered: number; total: number }
  >();
  for (const d of due) {
    const stat = topicStats.get(d.topic_id) ?? {
      count: 0,
      oldestDueAt: dueAtByFlashcard.get(d.id) ?? todayKey,
      remembered: 0,
      total: 0,
    };
    stat.count += 1;
    const dueAt = dueAtByFlashcard.get(d.id) ?? todayKey;
    if (dueAt < stat.oldestDueAt) stat.oldestDueAt = dueAt;
    topicStats.set(d.topic_id, stat);
  }
  for (const log of logs ?? []) {
    const topicId = flashcardToTopic.get(log.flashcard_id);
    if (!topicId) continue;
    const stat = topicStats.get(topicId);
    if (!stat) continue;
    stat.total += 1;
    if (log.grade > 0) stat.remembered += 1;
  }

  let best: { topicId: string; accuracy: number; oldestDueAt: string } | null = null;
  for (const [topicId, stat] of topicStats) {
    const accuracy = stat.total ? stat.remembered / stat.total : 1; // sem histórico = sem sinal de fraqueza
    if (
      !best ||
      accuracy < best.accuracy ||
      (accuracy === best.accuracy && stat.oldestDueAt < best.oldestDueAt)
    ) {
      best = { topicId, accuracy, oldestDueAt: stat.oldestDueAt };
    }
  }
  if (!best) return null;

  const topic = topicById.get(best.topicId);
  const stat = topicStats.get(best.topicId)!;
  if (!topic) return null;

  return {
    subjectId: topic.subject_id,
    topicId: topic.id,
    topicName: topic.name,
    subjectName: subjectNameById.get(topic.subject_id) ?? "",
    cardCount: stat.count,
    estimatedMinutes: Math.max(5, stat.count * 3),
  };
}

export type PerformanceDropInsight = {
  subjectName: string;
  recentAccuracyPct: number;
} | null;

// Compara acurácia rolante por disciplina, últimos 14 dias vs período
// anterior (14-28 dias atrás). Só acende o aviso com queda relevante e
// volume mínimo de dados, pra não alarmar por ruído estatístico.
export async function getPerformanceDropInsight(userId: string): Promise<PerformanceDropInsight> {
  const supabase = await createClient();

  const since28 = new Date();
  since28.setDate(since28.getDate() - 28);

  const { data: logs } = await supabase
    .from("review_logs")
    .select("flashcard_id, grade, reviewed_at")
    .eq("user_id", userId)
    .gte("reviewed_at", since28.toISOString());
  if (!logs?.length) return null;

  const flashcardIds = [...new Set(logs.map((l) => l.flashcard_id))];
  const { data: flashcards } = await supabase
    .from("flashcards")
    .select("id, topic_id")
    .in("id", flashcardIds);
  const topicByFlashcard = new Map((flashcards ?? []).map((f) => [f.id, f.topic_id]));

  const topicIds = [...new Set((flashcards ?? []).map((f) => f.topic_id))];
  const { data: topics } = await supabase.from("topics").select("id, subject_id").in("id", topicIds);
  const subjectByTopic = new Map((topics ?? []).map((t) => [t.id, t.subject_id]));

  const subjectIds = [...new Set((topics ?? []).map((t) => t.subject_id))];
  const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const bySubject = new Map<
    string,
    { recentRemembered: number; recentTotal: number; olderRemembered: number; olderTotal: number }
  >();

  for (const log of logs) {
    const topicId = topicByFlashcard.get(log.flashcard_id);
    const subjectId = topicId ? subjectByTopic.get(topicId) : null;
    if (!subjectId) continue;
    const stat = bySubject.get(subjectId) ?? {
      recentRemembered: 0,
      recentTotal: 0,
      olderRemembered: 0,
      olderTotal: 0,
    };
    const isRecent = new Date(log.reviewed_at) >= fourteenDaysAgo;
    if (isRecent) {
      stat.recentTotal += 1;
      if (log.grade > 0) stat.recentRemembered += 1;
    } else {
      stat.olderTotal += 1;
      if (log.grade > 0) stat.olderRemembered += 1;
    }
    bySubject.set(subjectId, stat);
  }

  const MIN_RECENT_REVIEWS = 5;
  const DROP_THRESHOLD_PCT = 15;

  for (const [subjectId, stat] of bySubject) {
    if (stat.recentTotal < MIN_RECENT_REVIEWS || stat.olderTotal === 0) continue;
    const recentPct = (stat.recentRemembered / stat.recentTotal) * 100;
    const olderPct = (stat.olderRemembered / stat.olderTotal) * 100;
    if (olderPct - recentPct >= DROP_THRESHOLD_PCT) {
      return {
        subjectName: subjectNameById.get(subjectId) ?? "",
        recentAccuracyPct: Math.round(recentPct),
      };
    }
  }
  return null;
}

export type WeekStats = {
  studiedMinutes: number;
  questionsDone: number;
  questionsAccuracyPct: number | null;
};

export async function getWeekStats(userId: string): Promise<WeekStats> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [{ data: focusRows }, { data: questionRows }] = await Promise.all([
    supabase
      .from("focus_sessions")
      .select("actual_minutes")
      .eq("user_id", userId)
      .gte("started_at", sevenDaysAgo.toISOString()),
    supabase
      .from("question_logs")
      .select("questions_done, questions_correct")
      .eq("user_id", userId)
      .gte("logged_at", sevenDaysAgo.toISOString()),
  ]);

  const studiedMinutes = (focusRows ?? []).reduce((sum, r) => sum + (r.actual_minutes ?? 0), 0);
  const questionsDone = (questionRows ?? []).reduce((sum, r) => sum + r.questions_done, 0);
  const questionsCorrect = (questionRows ?? []).reduce((sum, r) => sum + r.questions_correct, 0);

  return {
    studiedMinutes,
    questionsDone,
    questionsAccuracyPct: questionsDone ? Math.round((questionsCorrect / questionsDone) * 100) : null,
  };
}

export type WeekDot = { letter: string; done: boolean; isToday: boolean };

// Dias da semana atual (Seg a Dom) com marcação de quais tiveram atividade
// (Modo Foco ou revisão de flashcard), pro widget de constância na Home.
export async function getWeekActivityDots(userId: string): Promise<WeekDot[]> {
  const supabase = await createClient();

  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7; // 0 = segunda
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const [{ data: focusRows }, { data: reviewRows }] = await Promise.all([
    supabase.from("focus_sessions").select("started_at").eq("user_id", userId).gte("started_at", monday.toISOString()),
    supabase
      .from("review_logs")
      .select("reviewed_at")
      .eq("user_id", userId)
      .gte("reviewed_at", monday.toISOString()),
  ]);

  const activeDays = new Set<string>();
  for (const row of focusRows ?? []) activeDays.add(toLocalDateKey(new Date(row.started_at)));
  for (const row of reviewRows ?? []) activeDays.add(toLocalDateKey(new Date(row.reviewed_at)));

  const todayKey = toLocalDateKey(today);
  const dots: WeekDot[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const key = toLocalDateKey(day);
    dots.push({ letter: WEEKDAY_LETTERS_PT[i], done: activeDays.has(key), isToday: key === todayKey });
  }
  return dots;
}

export type TodayTask = {
  id: string;
  type: "revisao" | "prova" | "contato" | "ritual";
  title: string;
  subtitle: string;
  time: string | null;
  href: string;
  checkable: boolean;
  done: boolean;
};

export async function getTodayTasks(userId: string): Promise<TodayTask[]> {
  const supabase = await createClient();
  const todayKey = toLocalDateKey(new Date());

  const { data: manualTasks } = await supabase
    .from("calendar_tasks")
    .select("id, type, title, scheduled_time, subject_id, topic_id, status")
    .eq("user_id", userId)
    .eq("scheduled_date", todayKey)
    .order("scheduled_time", { ascending: true, nullsFirst: false });

  const tasks: TodayTask[] = (manualTasks ?? []).map((t) => ({
    id: t.id,
    type: t.type as TodayTask["type"],
    title: t.title,
    subtitle: "",
    time: t.scheduled_time,
    href: t.subject_id && t.topic_id ? `/subjects/${t.subject_id}/topics/${t.topic_id}` : "/calendar",
    checkable: true,
    done: t.status === "done",
  }));

  const { data: due } = await supabase
    .from("flashcards")
    .select("id, topic_id, flashcard_srs_state!inner(due_at)")
    .eq("user_id", userId)
    .lte("flashcard_srs_state.due_at", todayKey);

  if (due?.length) {
    const topicIds = [...new Set(due.map((d) => d.topic_id))];
    const { data: topics } = await supabase
      .from("topics")
      .select("id, name, subject_id")
      .in("id", topicIds);

    const subjectIds = [...new Set((topics ?? []).map((t) => t.subject_id))];
    const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
    const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));

    const countByTopic = new Map<string, number>();
    for (const d of due) countByTopic.set(d.topic_id, (countByTopic.get(d.topic_id) ?? 0) + 1);

    for (const topic of topics ?? []) {
      const count = countByTopic.get(topic.id) ?? 0;
      if (!count) continue;
      const subjectName = subjectNameById.get(topic.subject_id) ?? "";
      tasks.push({
        id: `revisao-${topic.id}`,
        type: "revisao",
        title: topic.name,
        subtitle: `Revisão, ${subjectName ?? ""} · ${count} ${count > 1 ? "cartões" : "cartão"}`,
        time: null,
        href: `/subjects/${topic.subject_id}/topics/${topic.id}`,
        checkable: false,
        done: false,
      });
    }
  }

  return tasks;
}
