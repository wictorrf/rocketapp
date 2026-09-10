import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey, dateKeyToUtcDate, addDaysToKey as addDaysKey } from "@/lib/utils/format";
import type { CalendarTaskType } from "@/lib/constants/calendar";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function firstOfMonthKey(year: number, month: number): string {
  return `${year}-${pad(month)}-01`;
}
function normalize(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export type CalendarStatus = "pending" | "done" | "cancelled";
export type CalendarOrigin = "manual" | "planejamento_mensal" | "fsrs";

export type CalendarItem = {
  id: string;
  origin: CalendarOrigin;
  type: CalendarTaskType;
  typeCustom: string | null;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  topicId: string | null;
  topicName: string | null;
  scheduledDate: string;
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  color: string | null;
  emoji: string | null;
  location: string | null;
  notes: string | null;
  status: CalendarStatus;
  recurrenceGroupId: string | null;
  showInChecklist: boolean;
  questionLogId: string | null;
  questionResult: { questionsDone: number; questionsCorrect: number } | null;
  cardCount: number | null; // só relevante quando origin === "fsrs"
};

type RawTaskRow = {
  id: string;
  type: string;
  type_custom: string | null;
  title: string;
  subject_id: string | null;
  topic_id: string | null;
  scheduled_date: string;
  end_date: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  color: string | null;
  emoji: string | null;
  location: string | null;
  notes: string | null;
  status: string;
  recurrence_group_id: string | null;
  show_in_checklist: boolean;
  question_log_id: string | null;
  subjects: { name: string } | { name: string }[] | null;
  topics: { name: string } | { name: string }[] | null;
  question_logs: { questions_done: number; questions_correct: number } | { questions_done: number; questions_correct: number }[] | null;
};

const TASK_SELECT = `
  id, type, type_custom, title, subject_id, topic_id, scheduled_date, end_date, all_day,
  start_time, end_time, color, emoji, location, notes, status, recurrence_group_id,
  show_in_checklist, question_log_id,
  subjects(name), topics(name), question_logs(questions_done, questions_correct)
`;

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function rowToItem(r: RawTaskRow): CalendarItem {
  const subject = one(r.subjects);
  const topic = one(r.topics);
  const questionLog = one(r.question_logs);
  return {
    id: r.id,
    origin: "manual",
    type: r.type as CalendarTaskType,
    typeCustom: r.type_custom,
    title: r.title,
    subjectId: r.subject_id,
    subjectName: subject?.name ?? null,
    topicId: r.topic_id,
    topicName: topic?.name ?? null,
    scheduledDate: r.scheduled_date,
    endDate: r.end_date,
    allDay: r.all_day,
    startTime: r.start_time,
    endTime: r.end_time,
    color: r.color,
    emoji: r.emoji,
    location: r.location,
    notes: r.notes,
    status: r.status as CalendarStatus,
    recurrenceGroupId: r.recurrence_group_id,
    showInChecklist: r.show_in_checklist,
    questionLogId: r.question_log_id,
    questionResult: questionLog
      ? { questionsDone: questionLog.questions_done, questionsCorrect: questionLog.questions_correct }
      : null,
    cardCount: null,
  };
}

// Revisões automáticas do FSRS nunca são linhas reais em calendar_tasks —
// são calculadas a partir do agendamento de flashcards e injetadas na
// exibição, uma entrada por assunto/dia. Ver lib/srs/fsrs.ts pro
// agendamento em si; aqui só agrupamos due_at por dia local.
async function getFsrsRevisionsInRange(
  userId: string,
  startDateKey: string,
  endDateKeyExclusive: string,
  timeZone: string,
): Promise<Map<string, CalendarItem[]>> {
  const supabase = await createClient();
  // Folga de 1 dia nos dois limites: o filtro SQL compara contra meia-noite
  // UTC, mas o agrupamento abaixo usa o dia LOCAL (toLocalDateKey). Um
  // due_at de madrugada UTC pode pertencer ao dia local anterior — sem essa
  // folga, ele seria descartado pelo SQL antes mesmo de chegar ao
  // agrupamento correto. O intervalo pedido pelo chamador continua sendo
  // respeitado, porque cada chamador só lê as chaves de dia que pediu.
  const { data } = await supabase
    .from("flashcards")
    .select("topic_id, flashcard_srs_state!inner(due_at, suspended_at)")
    .eq("user_id", userId)
    .is("flashcard_srs_state.suspended_at", null)
    .gte("flashcard_srs_state.due_at", `${addDaysKey(startDateKey, -1)}T00:00:00`)
    .lt("flashcard_srs_state.due_at", `${addDaysKey(endDateKeyExclusive, 1)}T00:00:00`);

  const countByDayTopic = new Map<string, number>();
  for (const row of data ?? []) {
    const srs = one(row.flashcard_srs_state as { due_at: string } | { due_at: string }[] | null);
    if (!srs || !row.topic_id) continue;
    const dateKey = toLocalDateKey(new Date(srs.due_at), timeZone);
    if (dateKey < startDateKey || dateKey >= endDateKeyExclusive) continue;
    const key = `${dateKey}::${row.topic_id}`;
    countByDayTopic.set(key, (countByDayTopic.get(key) ?? 0) + 1);
  }
  if (countByDayTopic.size === 0) return new Map();

  const topicIds = [...new Set([...countByDayTopic.keys()].map((k) => k.split("::")[1]))];
  const { data: topicRows } = await supabase.from("topics").select("id, name, subject_id").in("id", topicIds);
  const subjectIds = [...new Set((topicRows ?? []).map((t) => t.subject_id))];
  const { data: subjectRows } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectNameById = new Map((subjectRows ?? []).map((s) => [s.id, s.name]));
  const topicById = new Map((topicRows ?? []).map((t) => [t.id, t]));

  const byDay = new Map<string, CalendarItem[]>();
  for (const [key, cardCount] of countByDayTopic) {
    const [dateKey, topicId] = key.split("::");
    const topic = topicById.get(topicId);
    if (!topic) continue;
    const item: CalendarItem = {
      id: `fsrs-${topicId}-${dateKey}`,
      origin: "fsrs",
      type: "revisao",
      typeCustom: null,
      title: topic.name,
      subjectId: topic.subject_id,
      subjectName: subjectNameById.get(topic.subject_id) ?? null,
      topicId,
      topicName: topic.name,
      scheduledDate: dateKey,
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
      showInChecklist: false,
      questionLogId: null,
      questionResult: null,
      cardCount,
    };
    byDay.set(dateKey, [...(byDay.get(dateKey) ?? []), item]);
  }
  return byDay;
}

async function getManualItemsInRange(
  userId: string,
  startDateKey: string,
  endDateKey: string,
): Promise<Map<string, CalendarItem[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calendar_tasks")
    .select(TASK_SELECT)
    .eq("user_id", userId)
    .gte("scheduled_date", startDateKey)
    .lte("scheduled_date", endDateKey)
    .order("all_day", { ascending: false })
    .order("start_time", { ascending: true, nullsFirst: false });

  const byDay = new Map<string, CalendarItem[]>();
  for (const row of (data ?? []) as unknown as RawTaskRow[]) {
    const item = rowToItem(row);
    byDay.set(item.scheduledDate, [...(byDay.get(item.scheduledDate) ?? []), item]);
  }
  return byDay;
}

function mergeDayMaps(a: Map<string, CalendarItem[]>, b: Map<string, CalendarItem[]>): Map<string, CalendarItem[]> {
  const merged = new Map<string, CalendarItem[]>();
  for (const [k, v] of a) merged.set(k, [...v]);
  for (const [k, v] of b) merged.set(k, [...(merged.get(k) ?? []), ...v]);
  return merged;
}

export type DayCell = {
  day: number;
  dateKey: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  hasRitual: boolean;
  items: CalendarItem[];
  reviewCount: number;
};

export type MonthCalendar = {
  year: number;
  month: number;
  daysInMonth: number;
  startWeekday: number; // 0 = segunda .. 6 = domingo
  days: DayCell[];
  hasMonthlyPlan: boolean;
};

export async function getMonthCalendar(userId: string, year: number, month: number, timeZone: string): Promise<MonthCalendar> {
  const supabase = await createClient();
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = firstOfMonthKey(year, month);
  const monthEnd = `${year}-${pad(month)}-${pad(daysInMonth)}`;
  const jsStartWeekday = new Date(year, month - 1, 1).getDay();
  const startWeekday = (jsStartWeekday + 6) % 7;

  const [manualByDay, fsrsByDay, { data: monthlyPlan }] = await Promise.all([
    getManualItemsInRange(userId, monthStart, monthEnd),
    getFsrsRevisionsInRange(userId, monthStart, addDaysKey(monthEnd, 1), timeZone),
    supabase.from("monthly_plans").select("id").eq("user_id", userId).eq("month", monthStart).maybeSingle(),
  ]);
  const merged = mergeDayMaps(manualByDay, fsrsByDay);

  const todayKey = toLocalDateKey(new Date(), timeZone);
  const days: DayCell[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${pad(month)}-${pad(day)}`;
    const items = merged.get(dateKey) ?? [];
    days.push({
      day,
      dateKey,
      isToday: dateKey === todayKey,
      isCurrentMonth: true,
      hasRitual: day === 1 && Boolean(monthlyPlan),
      items,
      reviewCount: items.filter((i) => i.origin === "fsrs").reduce((sum, i) => sum + (i.cardCount ?? 0), 0),
    });
  }

  return { year, month, daysInMonth, startWeekday, days, hasMonthlyPlan: Boolean(monthlyPlan) };
}

export type WeekCalendar = {
  weekStart: string;
  days: DayCell[];
};

// weekStartKey deve ser uma segunda-feira.
export async function getWeekCalendar(userId: string, weekStartKey: string, timeZone: string): Promise<WeekCalendar> {
  const weekEndKey = addDaysKey(weekStartKey, 6);
  const [manualByDay, fsrsByDay] = await Promise.all([
    getManualItemsInRange(userId, weekStartKey, weekEndKey),
    getFsrsRevisionsInRange(userId, weekStartKey, addDaysKey(weekEndKey, 1), timeZone),
  ]);
  const merged = mergeDayMaps(manualByDay, fsrsByDay);
  const todayKey = toLocalDateKey(new Date(), timeZone);

  const days: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const dateKey = addDaysKey(weekStartKey, i);
    const items = merged.get(dateKey) ?? [];
    days.push({
      day: Number(dateKey.slice(-2)),
      dateKey,
      isToday: dateKey === todayKey,
      isCurrentMonth: true,
      hasRitual: false,
      items,
      reviewCount: items.filter((i) => i.origin === "fsrs").reduce((sum, i) => sum + (i.cardCount ?? 0), 0),
    });
  }
  return { weekStart: weekStartKey, days };
}

// Agenda dinâmica: por padrão mostra o que resta do dia atual; sem mais
// nada hoje, avança pro próximo dia (manual ou FSRS) que tiver alguma
// atividade — sem exigir atualização manual da pessoa.
export async function getAgendaAnchorDate(userId: string, fromDateKey: string, timeZone: string): Promise<string | null> {
  const supabase = await createClient();
  const horizonEnd = addDaysKey(fromDateKey, 120);

  const [{ data: nextTask }, fsrsByDay] = await Promise.all([
    supabase
      .from("calendar_tasks")
      .select("scheduled_date")
      .eq("user_id", userId)
      .gte("scheduled_date", fromDateKey)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    getFsrsRevisionsInRange(userId, fromDateKey, addDaysKey(horizonEnd, 1), timeZone),
  ]);

  const candidates = [nextTask?.scheduled_date ?? null, [...fsrsByDay.keys()].sort()[0] ?? null].filter(
    (d): d is string => Boolean(d),
  );
  if (candidates.length === 0) return null;
  return candidates.sort()[0];
}

export async function getAgendaDay(userId: string, dateKey: string, timeZone: string): Promise<CalendarItem[]> {
  const [manualByDay, fsrsByDay] = await Promise.all([
    getManualItemsInRange(userId, dateKey, dateKey),
    getFsrsRevisionsInRange(userId, dateKey, addDaysKey(dateKey, 1), timeZone),
  ]);
  return mergeDayMaps(manualByDay, fsrsByDay).get(dateKey) ?? [];
}

export type CalendarSearchResult = CalendarItem;

// Busca em Agenda: título, disciplina, assunto, tipo, tipo personalizado,
// local e notas — ignora maiúsculas/minúsculas e, quando possível, acentos.
export async function searchCalendarEvents(
  userId: string,
  query: string,
  range?: { startDateKey: string; endDateKey: string },
): Promise<CalendarSearchResult[]> {
  const supabase = await createClient();
  let q = supabase.from("calendar_tasks").select(TASK_SELECT).eq("user_id", userId).order("scheduled_date");
  if (range) q = q.gte("scheduled_date", range.startDateKey).lte("scheduled_date", range.endDateKey);

  const { data } = await q;
  const items = ((data ?? []) as unknown as RawTaskRow[]).map(rowToItem);
  if (!query.trim()) return items;

  const needle = normalize(query.trim());
  return items.filter((i) =>
    [i.title, i.subjectName, i.topicName, i.typeCustom, i.location, i.notes]
      .filter((v): v is string => Boolean(v))
      .some((v) => normalize(v).includes(needle)),
  );
}

export async function getEventById(userId: string, eventId: string): Promise<CalendarItem | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calendar_tasks")
    .select(TASK_SELECT)
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return rowToItem(data as unknown as RawTaskRow);
}

export type MonthlyPlanPillar = {
  key: string;
  customLabel?: string;
  purpose: string;
  metas: string[];
};

export type MonthlyPlanGoals = {
  mission: string;
  pillars: MonthlyPlanPillar[];
  review: string | null;
};

export type MonthlyPlan = {
  id: string;
  goals: MonthlyPlanGoals;
  completedAt: string | null;
  reviewedAt: string | null;
};

export async function getMonthlyPlan(userId: string, year: number, month: number): Promise<MonthlyPlan | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("monthly_plans")
    .select("id, goals, completed_at, reviewed_at")
    .eq("user_id", userId)
    .eq("month", firstOfMonthKey(year, month))
    .maybeSingle();
  if (!data) return null;

  const goals = data.goals as Partial<MonthlyPlanGoals> | null;
  return {
    id: data.id,
    goals: {
      mission: goals?.mission ?? "",
      pillars: goals?.pillars ?? [],
      review: goals?.review ?? null,
    },
    completedAt: data.completed_at,
    reviewedAt: data.reviewed_at,
  };
}

export async function getMonthlyPlanMission(userId: string, year: number, month: number): Promise<string> {
  const plan = await getMonthlyPlan(userId, year, month);
  return plan?.goals.mission ?? "";
}

export type MonthlyPlanAction = {
  id: string;
  planId: string;
  pillarKey: string | null;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  topicId: string | null;
  topicName: string | null;
  scheduledDate: string | null;
  startTime: string | null;
  endTime: string | null;
  type: string | null;
  typeCustom: string | null;
  note: string | null;
  color: string | null;
  calendarTaskId: string | null;
  status: "pending" | "done" | "archived";
};

export async function getMonthlyPlanActions(userId: string, planId: string): Promise<MonthlyPlanAction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("monthly_plan_actions")
    .select(
      "id, plan_id, pillar_key, title, subject_id, topic_id, scheduled_date, start_time, end_time, type, type_custom, note, color, calendar_task_id, status, subjects(name), topics(name)",
    )
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as unknown as {
    id: string;
    plan_id: string;
    pillar_key: string | null;
    title: string;
    subject_id: string | null;
    topic_id: string | null;
    scheduled_date: string | null;
    start_time: string | null;
    end_time: string | null;
    type: string | null;
    type_custom: string | null;
    note: string | null;
    color: string | null;
    calendar_task_id: string | null;
    status: string;
    subjects: { name: string } | { name: string }[] | null;
    topics: { name: string } | { name: string }[] | null;
  }[]).map((r) => ({
    id: r.id,
    planId: r.plan_id,
    pillarKey: r.pillar_key,
    title: r.title,
    subjectId: r.subject_id,
    subjectName: one(r.subjects)?.name ?? null,
    topicId: r.topic_id,
    topicName: one(r.topics)?.name ?? null,
    scheduledDate: r.scheduled_date,
    startTime: r.start_time,
    endTime: r.end_time,
    type: r.type,
    typeCustom: r.type_custom,
    note: r.note,
    color: r.color,
    calendarTaskId: r.calendar_task_id,
    status: r.status as MonthlyPlanAction["status"],
  }));
}

export type UpcomingExam = CalendarItem & { daysUntil: number };

// Provas e compromissos futuros pro card "Próximas provas e compromissos" do
// Dashboard — devolve o CalendarItem completo (não só um resumo) pra dar pra
// abrir o mesmo EventFormPanel do Calendário direto a partir do card.
export async function getUpcomingExamsAndCommitments(userId: string, timeZone: string, limit = 5): Promise<UpcomingExam[]> {
  const supabase = await createClient();
  const todayKey = toLocalDateKey(new Date(), timeZone);

  const { data } = await supabase
    .from("calendar_tasks")
    .select(TASK_SELECT)
    .eq("user_id", userId)
    .in("type", ["prova", "compromisso"])
    .neq("status", "cancelled")
    .gte("scheduled_date", todayKey)
    .order("scheduled_date", { ascending: true })
    .limit(limit);

  const todayUtc = dateKeyToUtcDate(todayKey);

  return ((data ?? []) as unknown as RawTaskRow[]).map((row) => {
    const item = rowToItem(row);
    const examDate = dateKeyToUtcDate(item.scheduledDate);
    const daysUntil = Math.round((examDate.getTime() - todayUtc.getTime()) / 86_400_000);
    return { ...item, daysUntil };
  });
}
