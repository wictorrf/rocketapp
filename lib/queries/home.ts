import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/utils/format";
import { startOfDayInTimeZone } from "@/lib/utils/timezone";
import { getAgendaDay, type CalendarItem } from "@/lib/queries/calendar";
import { getAllDueFlashcardsForUser } from "@/lib/queries/review";

// Estende CalendarItem (em vez de recortar um subconjunto de campos) pra
// dar pra passar um ChecklistItem de kind "calendar_task" direto como prop
// `event` do EventFormPanel (o mesmo formulário usado no Calendário), sem
// perder nenhum campo que o formulário precise.
export type ChecklistItem = CalendarItem & {
  kind: "calendar_task" | "plan_action" | "fsrs";
  checkable: boolean;
  reviewedTodayCount: number | null;
  planActionId: string | null;
  // true só no item agregado de flashcards do Checklist de hoje (ver
  // buildMixedFlashcardReviewItem) — dispara a revisão mista de todos os
  // assuntos em vez da revisão de um assunto específico.
  mixed?: boolean;
};

// Item único "Revisar flashcards — N cartões pendentes" do Checklist de
// hoje, substituindo os itens fsrs por assunto que vêm de getAgendaDay
// (esses continuam existindo no Calendário, só não aparecem aqui) — a
// estudante não deve precisar entrar em cada assunto separadamente.
function buildMixedFlashcardReviewItem(todayKey: string, cardCount: number): ChecklistItem {
  return {
    id: "fsrs-mixed",
    origin: "fsrs",
    type: "revisao",
    typeCustom: null,
    title: "Revisar flashcards",
    subjectId: null,
    subjectName: null,
    topicId: null,
    topicName: null,
    scheduledDate: todayKey,
    endDate: null,
    allDay: true,
    startTime: null,
    endTime: null,
    color: null,
    emoji: null,
    location: null,
    notes: null,
    status: "pending",
    recurrenceGroupId: null,
    showInChecklist: true,
    questionLogId: null,
    questionResult: null,
    cardCount,
    kind: "fsrs",
    checkable: false,
    reviewedTodayCount: null,
    planActionId: null,
    mixed: true,
  };
}

function fromCalendarItem(item: CalendarItem): ChecklistItem {
  return {
    ...item,
    kind: item.origin === "fsrs" ? "fsrs" : "calendar_task",
    checkable: item.origin !== "fsrs",
    reviewedTodayCount: null,
    planActionId: null,
  };
}

// Ações do planejamento mensal SEM vínculo com um evento do Calendário —
// as vinculadas já aparecem via getAgendaDay (contam como "manual"), então
// buscar de novo aqui duplicaria o item no checklist.
async function getUnlinkedPlanActionsInRange(
  userId: string,
  startKey: string,
  endKey: string,
): Promise<ChecklistItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("monthly_plan_actions")
    .select(
      "id, title, subject_id, topic_id, scheduled_date, start_time, end_time, type, type_custom, note, color, status, subjects(name), topics(name)",
    )
    .eq("user_id", userId)
    .is("calendar_task_id", null)
    .neq("status", "archived")
    .gte("scheduled_date", startKey)
    .lte("scheduled_date", endKey);

  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);

  return ((data ?? []) as unknown as {
    id: string;
    title: string;
    subject_id: string | null;
    topic_id: string | null;
    scheduled_date: string;
    start_time: string | null;
    end_time: string | null;
    type: string | null;
    type_custom: string | null;
    note: string | null;
    color: string | null;
    status: string;
    subjects: { name: string } | { name: string }[] | null;
    topics: { name: string } | { name: string }[] | null;
  }[]).map(
    (r): ChecklistItem => ({
      id: `plan-${r.id}`,
      kind: "plan_action",
      origin: "planejamento_mensal",
      type: (r.type ?? "estudo") as CalendarItem["type"],
      typeCustom: r.type_custom,
      title: r.title,
      subjectId: r.subject_id,
      subjectName: one(r.subjects)?.name ?? null,
      topicId: r.topic_id,
      topicName: one(r.topics)?.name ?? null,
      scheduledDate: r.scheduled_date,
      endDate: null,
      startTime: r.start_time,
      endTime: r.end_time,
      allDay: !r.start_time,
      status: r.status === "done" ? "done" : "pending",
      checkable: true,
      color: r.color,
      emoji: null,
      location: null,
      notes: r.note,
      recurrenceGroupId: null,
      showInChecklist: true,
      questionLogId: null,
      questionResult: null,
      cardCount: null,
      reviewedTodayCount: null,
      planActionId: r.id,
    }),
  );
}

// Quantos cartões de cada assunto (dentre os que ainda restam na fila hoje)
// já foram respondidos hoje — pra mostrar "8 de 12 revisados" em vez de só
// "4 restantes" numa revisão parcialmente concluída (ver getFsrsRevisionsInRange).
async function attachReviewedTodayCounts(userId: string, items: ChecklistItem[], timeZone: string): Promise<void> {
  const fsrsItems = items.filter((i) => i.kind === "fsrs" && i.topicId);
  if (fsrsItems.length === 0) return;

  const supabase = await createClient();
  const topicIds = fsrsItems.map((i) => i.topicId!) as string[];
  const { data: flashcards } = await supabase.from("flashcards").select("id, topic_id").eq("user_id", userId).in("topic_id", topicIds);
  const topicByFlashcard = new Map((flashcards ?? []).map((f) => [f.id, f.topic_id]));
  const flashcardIds = (flashcards ?? []).map((f) => f.id);
  if (flashcardIds.length === 0) return;

  const startOfToday = startOfDayInTimeZone(toLocalDateKey(new Date(), timeZone), timeZone);
  const { data: logs } = await supabase
    .from("review_logs")
    .select("flashcard_id")
    .in("flashcard_id", flashcardIds)
    .gte("reviewed_at", startOfToday.toISOString());

  const reviewedByTopic = new Map<string, number>();
  for (const log of logs ?? []) {
    const topicId = topicByFlashcard.get(log.flashcard_id);
    if (!topicId) continue;
    reviewedByTopic.set(topicId, (reviewedByTopic.get(topicId) ?? 0) + 1);
  }
  for (const item of fsrsItems) {
    item.reviewedTodayCount = reviewedByTopic.get(item.topicId!) ?? 0;
  }
}

// Ordena conforme o documento: atrasados primeiro, depois cronológico,
// revisões previstas pra hoje, atividades sem horário, e por último as já
// concluídas.
function sortChecklistItems(items: ChecklistItem[], todayKey: string): ChecklistItem[] {
  const nowIso = new Date().toISOString();
  function rank(item: ChecklistItem): number {
    if (item.status === "done") return 4;
    if (item.kind === "fsrs") return 2;
    if (item.scheduledDate < todayKey) return 0; // atrasada (só relevante na visão semanal)
    if (item.startTime && `${item.scheduledDate}T${item.startTime}` < nowIso && item.scheduledDate === todayKey) return 0;
    if (item.startTime) return 1;
    return 3; // sem horário
  }
  return [...items].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    if (a.startTime && b.startTime) return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0;
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

// Válida pro cálculo da barra de progresso: exclui canceladas e revisões
// FSRS (que nunca são "concluíveis" manualmente, então não entram no
// denominador de "X de Y atividades concluídas").
function isCountableForProgress(item: ChecklistItem): boolean {
  return item.kind !== "fsrs" && item.status !== "cancelled";
}

export type DayChecklist = {
  dateKey: string;
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
};

export async function getTodayChecklist(userId: string, timeZone: string): Promise<DayChecklist> {
  const todayKey = toLocalDateKey(new Date(), timeZone);
  const [calendarItems, planItems, { composition }] = await Promise.all([
    getAgendaDay(userId, todayKey, timeZone),
    getUnlinkedPlanActionsInRange(userId, todayKey, todayKey),
    getAllDueFlashcardsForUser(userId),
  ]);

  // Os itens fsrs por assunto vindos do calendário viram um único item
  // agregado (ver buildMixedFlashcardReviewItem) — o Calendário em si
  // continua mostrando por assunto, só o Checklist do Dashboard muda.
  const nonFsrsCalendarItems = calendarItems.filter((item) => item.origin !== "fsrs");
  const totalDue = composition.overdue + composition.dueToday + composition.newCards;
  const mixedFlashcardItem = totalDue > 0 ? [buildMixedFlashcardReviewItem(todayKey, totalDue)] : [];

  const items = [...nonFsrsCalendarItems.map(fromCalendarItem), ...planItems, ...mixedFlashcardItem];
  await attachReviewedTodayCounts(userId, items, timeZone);
  const sorted = sortChecklistItems(items, todayKey);

  const countable = sorted.filter(isCountableForProgress);
  return {
    dateKey: todayKey,
    items: sorted,
    completedCount: countable.filter((i) => i.status === "done").length,
    totalCount: countable.length,
  };
}

