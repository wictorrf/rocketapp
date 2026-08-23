import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/utils/format";
import { isRemembered } from "@/lib/metrics/calc";
import { getAgendaDay, getWeekCalendar, getMonthlyPlan, getMonthlyPlanActions, type CalendarItem } from "@/lib/queries/calendar";
import { getAllDueFlashcardsForUser } from "@/lib/queries/review";
import { estimateReviewMinutes } from "@/lib/srs/fsrs";
import { WEEKDAY_LABEL_MON_FIRST_PT } from "@/lib/constants/calendar";

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
// devidos), desempatando pelo mais atrasado. Alimenta o "assunto
// prioritário" do card de revisão em destaque.
export async function getPriorityTask(userId: string): Promise<PriorityTask | null> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: due } = await supabase
    .from("flashcards")
    .select("id, topic_id, flashcard_srs_state!inner(due_at, suspended_at)")
    .eq("user_id", userId)
    .is("flashcard_srs_state.suspended_at", null)
    .lte("flashcard_srs_state.due_at", nowIso);

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
      return [d.id, srs?.due_at ?? nowIso];
    }),
  );

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const dueFlashcardIds = due.map((d) => d.id);
  const { data: logs } = await supabase
    .from("review_logs")
    .select("flashcard_id, rating")
    .in("flashcard_id", dueFlashcardIds)
    .gte("reviewed_at", fourteenDaysAgo.toISOString());

  const topicStats = new Map<
    string,
    { count: number; oldestDueAt: string; remembered: number; total: number }
  >();
  for (const d of due) {
    const stat = topicStats.get(d.topic_id) ?? {
      count: 0,
      oldestDueAt: dueAtByFlashcard.get(d.id) ?? nowIso,
      remembered: 0,
      total: 0,
    };
    stat.count += 1;
    const dueAt = dueAtByFlashcard.get(d.id) ?? nowIso;
    if (dueAt < stat.oldestDueAt) stat.oldestDueAt = dueAt;
    topicStats.set(d.topic_id, stat);
  }
  for (const log of logs ?? []) {
    const topicId = flashcardToTopic.get(log.flashcard_id);
    if (!topicId) continue;
    const stat = topicStats.get(topicId);
    if (!stat) continue;
    stat.total += 1;
    if (isRemembered(log.rating)) stat.remembered += 1;
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
    estimatedMinutes: estimateReviewMinutes(stat.count),
  };
}

export type FlashcardReviewHighlight = {
  overdueCount: number;
  dueTodayCount: number;
  newCount: number;
  totalCount: number;
  estimatedMinutes: number;
  priority: PriorityTask | null;
};

// Card "Revisão de flashcards em destaque" do Dashboard: composição da fila
// (atrasados/hoje/novos) + assunto prioritário + estimativa de duração.
export async function getFlashcardReviewHighlight(userId: string): Promise<FlashcardReviewHighlight> {
  const [{ composition }, priority] = await Promise.all([getAllDueFlashcardsForUser(userId), getPriorityTask(userId)]);
  const totalCount = composition.overdue + composition.dueToday + composition.newCards;
  return {
    overdueCount: composition.overdue,
    dueTodayCount: composition.dueToday,
    newCount: composition.newCards,
    totalCount,
    estimatedMinutes: estimateReviewMinutes(totalCount),
    priority,
  };
}

// Estende CalendarItem (em vez de recortar um subconjunto de campos) pra
// dar pra passar um ChecklistItem de kind "calendar_task" direto como prop
// `event` do EventFormPanel (o mesmo formulário usado no Calendário), sem
// perder nenhum campo que o formulário precise.
export type ChecklistItem = CalendarItem & {
  kind: "calendar_task" | "plan_action" | "fsrs";
  checkable: boolean;
  reviewedTodayCount: number | null;
  planActionId: string | null;
};

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
// as vinculadas já aparecem via getAgendaDay/getWeekCalendar (contam como
// "manual"), então buscar de novo aqui duplicaria o item no checklist.
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
async function attachReviewedTodayCounts(userId: string, items: ChecklistItem[]): Promise<void> {
  const fsrsItems = items.filter((i) => i.kind === "fsrs" && i.topicId);
  if (fsrsItems.length === 0) return;

  const supabase = await createClient();
  const topicIds = fsrsItems.map((i) => i.topicId!) as string[];
  const { data: flashcards } = await supabase.from("flashcards").select("id, topic_id").eq("user_id", userId).in("topic_id", topicIds);
  const topicByFlashcard = new Map((flashcards ?? []).map((f) => [f.id, f.topic_id]));
  const flashcardIds = (flashcards ?? []).map((f) => f.id);
  if (flashcardIds.length === 0) return;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
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

export async function getTodayChecklist(userId: string): Promise<DayChecklist> {
  const todayKey = toLocalDateKey(new Date());
  const [calendarItems, planItems] = await Promise.all([
    getAgendaDay(userId, todayKey),
    getUnlinkedPlanActionsInRange(userId, todayKey, todayKey),
  ]);

  const items = [...calendarItems.map(fromCalendarItem), ...planItems];
  await attachReviewedTodayCounts(userId, items);
  const sorted = sortChecklistItems(items, todayKey);

  const countable = sorted.filter(isCountableForProgress);
  return {
    dateKey: todayKey,
    items: sorted,
    completedCount: countable.filter((i) => i.status === "done").length,
    totalCount: countable.length,
  };
}

export type WeekChecklistDay = {
  dateKey: string;
  dayLabel: string;
  isToday: boolean;
  items: ChecklistItem[];
};

export type WeekChecklist = {
  weekStartKey: string;
  days: WeekChecklistDay[];
  completedCount: number;
  totalCount: number;
};

function mondayKeyOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toLocalDateKey(d);
}

// Usa getWeekCalendar (mesma fonte que a tela de Calendário) pra nunca
// divergir de lá, e mescla as ações do planejamento mensal sem vínculo.
export async function getWeekChecklist(userId: string, anchorDateKey?: string): Promise<WeekChecklist> {
  const weekStartKey = mondayKeyOf(anchorDateKey ? new Date(`${anchorDateKey}T00:00:00`) : new Date());
  const weekEndDate = new Date(`${weekStartKey}T00:00:00`);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndKey = toLocalDateKey(weekEndDate);
  const todayKey = toLocalDateKey(new Date());

  const [week, planItems] = await Promise.all([
    getWeekCalendar(userId, weekStartKey),
    getUnlinkedPlanActionsInRange(userId, weekStartKey, weekEndKey),
  ]);

  const calendarItems = week.days.flatMap((d) => d.items.map(fromCalendarItem));
  const allItems = [...calendarItems, ...planItems];
  await attachReviewedTodayCounts(userId, allItems);

  const days: WeekChecklistDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${weekStartKey}T00:00:00`);
    d.setDate(d.getDate() + i);
    const dateKey = toLocalDateKey(d);
    const dayItems = allItems.filter((it) => it.scheduledDate === dateKey);
    days.push({
      dateKey,
      dayLabel: WEEKDAY_LABEL_MON_FIRST_PT[i],
      isToday: dateKey === todayKey,
      items: sortChecklistItems(dayItems, todayKey),
    });
  }

  const countable = allItems.filter(isCountableForProgress);
  return {
    weekStartKey,
    days,
    completedCount: countable.filter((i) => i.status === "done").length,
    totalCount: countable.length,
  };
}

export type MonthPlanSummary = {
  hasPlan: boolean;
  mission: string;
  actionsTotal: number;
  actionsDone: number;
  progressPct: number | null;
};

export async function getMonthPlanSummary(userId: string, year: number, month: number): Promise<MonthPlanSummary> {
  const plan = await getMonthlyPlan(userId, year, month);
  if (!plan) return { hasPlan: false, mission: "", actionsTotal: 0, actionsDone: 0, progressPct: null };

  const actions = await getMonthlyPlanActions(userId, plan.id);
  const active = actions.filter((a) => a.status !== "archived");
  const done = active.filter((a) => a.status === "done").length;

  return {
    hasPlan: true,
    mission: plan.goals.mission,
    actionsTotal: active.length,
    actionsDone: done,
    progressPct: active.length ? Math.round((done / active.length) * 100) : null,
  };
}
