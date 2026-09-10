"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDaysToKey, toLocalDateKey } from "@/lib/utils/format";
import { getUserTimezone } from "@/lib/utils/timezone";
import { TASK_TYPE_OPTIONS } from "@/lib/constants/calendar";
import { MAX_PILLARS } from "@/lib/constants/pillars";
import { materializeOccurrenceDates, type RecurrenceRule } from "@/lib/calendar/recurrence";
import { getEventById, searchCalendarEvents, type CalendarItem, type MonthlyPlanGoals } from "@/lib/queries/calendar";

export type ActionState = { error: string | null };
export type EventActionResult = { error: string | null; eventId?: string };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function revalidateCalendarPaths() {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

const addDaysKey = addDaysToKey;
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000);
}

type EventContentFields = {
  type: string;
  type_custom: string | null;
  title: string;
  subject_id: string | null;
  topic_id: string | null;
  location: string | null;
  notes: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  color: string | null;
  emoji: string | null;
  show_in_checklist: boolean;
};

// Lê e valida os campos de conteúdo do formulário (tudo exceto data e
// recorrência, que só fazem sentido na criação ou na edição de "só este").
function parseEventContent(formData: FormData): { error: string } | { fields: EventContentFields } {
  const type = String(formData.get("type") ?? "");
  const typeCustom = String(formData.get("typeCustom") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim() || null;
  const topicId = String(formData.get("topicId") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const allDay = formData.get("allDay") === "on";
  const startTime = String(formData.get("startTime") ?? "").trim() || null;
  const endTime = String(formData.get("endTime") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || null;
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const showInChecklist = formData.get("showInChecklist") !== "off";

  if (!TASK_TYPE_OPTIONS.some((o) => o.value === type)) return { error: "Tipo de evento inválido." };
  if (type === "outro" && !typeCustom) return { error: "Descreva o tipo do evento." };
  if (!title) return { error: "O título não pode ficar em branco." };
  if (!allDay && (!startTime || !endTime)) {
    return { error: "Informe o horário de início e término, ou marque como dia inteiro." };
  }

  return {
    fields: {
      type,
      type_custom: type === "outro" ? typeCustom : null,
      title,
      subject_id: subjectId,
      topic_id: subjectId ? topicId : null,
      location,
      notes,
      all_day: allDay,
      start_time: allDay ? null : startTime,
      end_time: allDay ? null : endTime,
      color,
      emoji,
      show_in_checklist: showInChecklist,
    },
  };
}

function parseRecurrenceRule(formData: FormData): RecurrenceRule | null {
  const frequency = String(formData.get("repeatFrequency") ?? "none");
  if (frequency === "none") return null;
  if (frequency !== "daily" && frequency !== "weekly" && frequency !== "monthly" && frequency !== "custom") {
    return null;
  }
  // "".split(",") retorna [""], e Number("") é 0 (domingo) — sem o filtro
  // abaixo, nenhum dia marcado seria lido como "todo domingo" em vez de
  // "usa o dia da semana da data inicial" (o comportamento default real).
  const weekdays = String(formData.get("repeatWeekdays") ?? "")
    .split(",")
    .filter((v) => v !== "")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const until = String(formData.get("repeatUntil") ?? "").trim() || null;
  const countRaw = formData.get("repeatCount");
  const count = countRaw ? Math.max(1, Math.round(Number(countRaw))) : null;

  return { frequency, weekdays, until: frequency === "custom" ? until : null, count: frequency === "custom" ? count : null };
}

export async function createCalendarEventAction(
  _prevState: EventActionResult,
  formData: FormData,
): Promise<EventActionResult> {
  const { supabase, user } = await requireUser();

  const scheduledDate = String(formData.get("scheduledDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim() || null;
  if (!scheduledDate) return { error: "Escolha a data do evento." };

  const parsed = parseEventContent(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const endDate = endDateRaw;
  if (!fields.all_day) {
    if (endDate && endDate < scheduledDate) return { error: "A data de término não pode ser anterior à data de início." };
    const sameDay = !endDate || endDate === scheduledDate;
    if (sameDay && fields.start_time && fields.end_time && fields.end_time <= fields.start_time) {
      return { error: "Esse evento passa da meia-noite — informe também a data de término." };
    }
  }

  const rule = parseRecurrenceRule(formData);
  const dates = materializeOccurrenceDates(scheduledDate, rule);
  const groupId = dates.length > 1 ? crypto.randomUUID() : null;
  const dayOffset = endDate ? daysBetween(scheduledDate, endDate) : null;

  const rows = dates.map((d) => ({
    user_id: user.id,
    scheduled_date: d,
    end_date: dayOffset !== null ? addDaysKey(d, dayOffset) : null,
    source: "manual" as const,
    recurrence_group_id: groupId,
    ...fields,
  }));

  const { data, error } = await supabase.from("calendar_tasks").insert(rows).select("id");
  if (error || !data) return { error: "Não foi possível criar o evento. Tente novamente." };

  revalidateCalendarPaths();
  return { error: null, eventId: data[0].id };
}

export async function updateCalendarEventAction(
  eventId: string,
  scope: "this" | "future" | "all",
  _prevState: EventActionResult,
  formData: FormData,
): Promise<EventActionResult> {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("calendar_tasks")
    .select("user_id, scheduled_date, recurrence_group_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!existing || existing.user_id !== user.id) return { error: "Evento não encontrado." };

  const parsed = parseEventContent(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const scheduledDate = String(formData.get("scheduledDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim() || null;

  if (scope === "this" || !existing.recurrence_group_id) {
    if (!scheduledDate) return { error: "Escolha a data do evento." };
    if (!fields.all_day) {
      const sameDay = !endDateRaw || endDateRaw === scheduledDate;
      if (endDateRaw && endDateRaw < scheduledDate) return { error: "A data de término não pode ser anterior à data de início." };
      if (sameDay && fields.start_time && fields.end_time && fields.end_time <= fields.start_time) {
        return { error: "Esse evento passa da meia-noite — informe também a data de término." };
      }
    }
    const { error } = await supabase
      .from("calendar_tasks")
      .update({ ...fields, scheduled_date: scheduledDate, end_date: endDateRaw })
      .eq("id", eventId)
      .eq("user_id", user.id);
    if (error) return { error: "Não foi possível salvar as alterações." };
  } else {
    // "este e os próximos" / "todos da série": conteúdo e horário se aplicam
    // à série inteira, mas a DATA de cada ocorrência nunca é tocada aqui —
    // mudar o dia/padrão de recorrência exige recriar a série.
    let q = supabase
      .from("calendar_tasks")
      .update(fields)
      .eq("user_id", user.id)
      .eq("recurrence_group_id", existing.recurrence_group_id);
    if (scope === "future") q = q.gte("scheduled_date", existing.scheduled_date);
    const { error } = await q;
    if (error) return { error: "Não foi possível salvar as alterações." };
  }

  revalidateCalendarPaths();
  return { error: null, eventId };
}

// Quantas ocorrências essa série tem no total e a partir de hoje/desta data
// em diante — alimenta o aviso "esta ação excluirá N ocorrências" no
// diálogo de escopo antes de confirmar edição/exclusão em massa.
export async function getSeriesOccurrenceCountsAction(
  recurrenceGroupId: string,
  fromDateKey: string,
): Promise<{ future: number; total: number }> {
  const { supabase, user } = await requireUser();
  const [{ count: future }, { count: total }] = await Promise.all([
    supabase
      .from("calendar_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("recurrence_group_id", recurrenceGroupId)
      .gte("scheduled_date", fromDateKey),
    supabase
      .from("calendar_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("recurrence_group_id", recurrenceGroupId),
  ]);
  return { future: future ?? 0, total: total ?? 0 };
}

export async function deleteCalendarEventAction(
  eventId: string,
  scope: "this" | "future" | "all",
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("calendar_tasks")
    .select("user_id, scheduled_date, recurrence_group_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!existing || existing.user_id !== user.id) return { error: "Evento não encontrado." };

  if (scope === "this" || !existing.recurrence_group_id) {
    const { error } = await supabase.from("calendar_tasks").delete().eq("id", eventId).eq("user_id", user.id);
    if (error) return { error: "Não foi possível excluir o evento." };
  } else {
    let q = supabase
      .from("calendar_tasks")
      .delete()
      .eq("user_id", user.id)
      .eq("recurrence_group_id", existing.recurrence_group_id);
    if (scope === "future") q = q.gte("scheduled_date", existing.scheduled_date);
    const { error } = await q;
    if (error) return { error: "Não foi possível excluir os eventos da série." };
  }

  revalidateCalendarPaths();
  return { error: null };
}

export async function setEventStatusAction(
  eventId: string,
  status: "pending" | "done" | "cancelled",
): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase.from("calendar_tasks").update({ status }).eq("id", eventId).eq("user_id", user.id);
  revalidateCalendarPaths();
}

// Mantido pro checkbox otimista do checklist do Dashboard (só alterna
// pending/done — cancelar e reagendar vivem no menu de ações do Calendário).
export async function toggleTaskStatusAction(taskId: string, done: boolean) {
  await setEventStatusAction(taskId, done ? "done" : "pending");
}

// Sem `searchAll`, restringe aos próximos 120 dias (o horizonte natural da
// Agenda) — com `searchAll`, busca em todo o histórico da pessoa.
export async function searchCalendarEventsAction(query: string, searchAll: boolean): Promise<CalendarItem[]> {
  const { user } = await requireUser();
  if (searchAll) return searchCalendarEvents(user.id, query);

  const timeZone = await getUserTimezone();
  const todayKey = toLocalDateKey(new Date(), timeZone);
  const endKey = addDaysKey(todayKey, 120);
  return searchCalendarEvents(user.id, query, { startDateKey: todayKey, endDateKey: endKey });
}

export async function duplicateCalendarEventAction(eventId: string): Promise<EventActionResult> {
  const { supabase, user } = await requireUser();
  const event = await getEventById(user.id, eventId);
  if (!event) return { error: "Evento não encontrado." };

  const { data, error } = await supabase
    .from("calendar_tasks")
    .insert({
      user_id: user.id,
      type: event.type,
      type_custom: event.typeCustom,
      title: `${event.title} (cópia)`,
      subject_id: event.subjectId,
      topic_id: event.topicId,
      scheduled_date: event.scheduledDate,
      end_date: event.endDate,
      all_day: event.allDay,
      start_time: event.startTime,
      end_time: event.endTime,
      color: event.color,
      emoji: event.emoji,
      location: event.location,
      notes: event.notes,
      source: "manual",
      show_in_checklist: event.showInChecklist,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Não foi possível duplicar o evento." };

  revalidateCalendarPaths();
  return { error: null, eventId: data.id };
}

export async function registerQuestionResultAction(
  eventId: string,
  questionsDone: number,
  questionsCorrect: number,
  note: string,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { data: event } = await supabase
    .from("calendar_tasks")
    .select("user_id, topic_id, type")
    .eq("id", eventId)
    .maybeSingle();
  if (!event || event.user_id !== user.id) return { error: "Evento não encontrado." };
  if (event.type !== "questoes") return { error: "Esse evento não é do tipo Questões." };
  if (!event.topic_id) return { error: "Vincule uma disciplina e um assunto a esse evento antes de registrar o resultado." };
  if (!Number.isFinite(questionsDone) || questionsDone <= 0) return { error: "Informe a quantidade de questões respondidas." };
  if (!Number.isFinite(questionsCorrect) || questionsCorrect < 0 || questionsCorrect > questionsDone) {
    return { error: "Os acertos não podem ultrapassar o total respondido." };
  }

  const { data: log, error } = await supabase
    .from("question_logs")
    .insert({
      user_id: user.id,
      topic_id: event.topic_id,
      questions_done: Math.round(questionsDone),
      questions_correct: Math.round(questionsCorrect),
      note: note.trim() || null,
      log_type: "questoes",
    })
    .select("id")
    .single();
  if (error || !log) return { error: "Não foi possível registrar o resultado." };

  await supabase.from("calendar_tasks").update({ question_log_id: log.id, status: "done" }).eq("id", eventId);
  revalidateCalendarPaths();
  revalidatePath("/metrics");
  return { error: null };
}

// ---------------- Planejamento mensal ----------------

export async function saveMonthlyPlanAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const month = String(formData.get("month") ?? "");
  const mission = String(formData.get("mission") ?? "").trim();
  const selectedPillars = String(formData.get("selectedPillars") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, MAX_PILLARS);

  if (!month || !mission) return { error: "Escreva a missão do mês." };
  if (selectedPillars.length === 0) return { error: "Escolha pelo menos um pilar do mês." };

  const pillars = selectedPillars.map((key) => ({
    key,
    customLabel: key === "outro" ? String(formData.get("customPillarLabel") ?? "").trim() : undefined,
    purpose: String(formData.get(`purpose_${key}`) ?? "").trim(),
    metas: String(formData.get(`metas_${key}`) ?? "")
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean),
  }));

  const { data: existing } = await supabase
    .from("monthly_plans")
    .select("goals")
    .eq("user_id", user.id)
    .eq("month", month)
    .maybeSingle();
  const previousReview = (existing?.goals as MonthlyPlanGoals | null)?.review ?? null;

  const goals: MonthlyPlanGoals = { mission, pillars, review: previousReview };

  const { error } = await supabase
    .from("monthly_plans")
    .upsert({ user_id: user.id, month, goals, completed_at: new Date().toISOString() }, { onConflict: "user_id,month" });
  if (error) return { error: "Não foi possível salvar o planejamento. Tente novamente." };

  revalidateCalendarPaths();
  return { error: null };
}

export async function deleteMonthlyPlanAction(planId: string, alsoDeleteLinkedEvents: boolean): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { data: plan } = await supabase.from("monthly_plans").select("user_id").eq("id", planId).maybeSingle();
  if (!plan || plan.user_id !== user.id) return { error: "Planejamento não encontrado." };

  const { data: actions } = await supabase
    .from("monthly_plan_actions")
    .select("calendar_task_id")
    .eq("plan_id", planId);
  const linkedEventIds = (actions ?? []).map((a) => a.calendar_task_id).filter((id): id is string => Boolean(id));

  if (linkedEventIds.length) {
    if (alsoDeleteLinkedEvents) {
      await supabase.from("calendar_tasks").delete().in("id", linkedEventIds).eq("user_id", user.id);
    } else {
      await supabase.from("calendar_tasks").update({ source: "manual" }).in("id", linkedEventIds).eq("user_id", user.id);
    }
  }

  const { error } = await supabase.from("monthly_plans").delete().eq("id", planId).eq("user_id", user.id);
  if (error) return { error: "Não foi possível excluir o planejamento." };

  revalidateCalendarPaths();
  return { error: null };
}

export async function saveMonthlyReviewAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const month = String(formData.get("month") ?? "");
  const review = String(formData.get("review") ?? "").trim();
  if (!month || !review) return { error: "Escreva sua revisão do mês." };

  const { data: existing } = await supabase
    .from("monthly_plans")
    .select("goals")
    .eq("user_id", user.id)
    .eq("month", month)
    .maybeSingle();
  if (!existing) return { error: "Planeje o mês antes de fazer a revisão." };

  const goals = { ...(existing.goals as MonthlyPlanGoals), review };

  const { error } = await supabase
    .from("monthly_plans")
    .update({ goals, reviewed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("month", month);
  if (error) return { error: "Não foi possível salvar a revisão. Tente novamente." };

  revalidatePath("/calendar");
  return { error: null };
}

// ---------------- Ações práticas do planejamento ----------------

async function insertLinkedCalendarEvent(
  supabase: SupabaseClient,
  userId: string,
  fields: {
    title: string;
    subjectId: string | null;
    topicId: string | null;
    scheduledDate: string;
    startTime: string | null;
    endTime: string | null;
    type: string | null;
    typeCustom: string | null;
    note: string | null;
    color: string | null;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("calendar_tasks")
    .insert({
      user_id: userId,
      type: fields.type || "estudo",
      type_custom: fields.typeCustom,
      title: fields.title,
      subject_id: fields.subjectId,
      topic_id: fields.topicId,
      scheduled_date: fields.scheduledDate,
      all_day: !fields.startTime,
      start_time: fields.startTime,
      end_time: fields.endTime,
      notes: fields.note,
      color: fields.color,
      source: "planejamento_mensal",
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function createPlanActionAction(planId: string, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { data: plan } = await supabase.from("monthly_plans").select("user_id").eq("id", planId).maybeSingle();
  if (!plan || plan.user_id !== user.id) return { error: "Planejamento não encontrado." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Escreva o título da ação." };

  const pillarKey = String(formData.get("pillarKey") ?? "").trim() || null;
  const subjectId = String(formData.get("subjectId") ?? "").trim() || null;
  const topicId = subjectId ? String(formData.get("topicId") ?? "").trim() || null : null;
  const scheduledDate = String(formData.get("scheduledDate") ?? "").trim() || null;
  const startTime = String(formData.get("startTime") ?? "").trim() || null;
  const endTime = String(formData.get("endTime") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "").trim() || null;
  const typeCustom = String(formData.get("typeCustom") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || null;
  const addToCalendar = formData.get("addToCalendar") === "on";

  let calendarTaskId: string | null = null;
  if (addToCalendar) {
    if (!scheduledDate) return { error: "Escolha uma data pra adicionar essa ação ao Calendário." };
    calendarTaskId = await insertLinkedCalendarEvent(supabase, user.id, {
      title,
      subjectId,
      topicId,
      scheduledDate,
      startTime,
      endTime,
      type,
      typeCustom,
      note,
      color,
    });
  }

  const { error } = await supabase.from("monthly_plan_actions").insert({
    user_id: user.id,
    plan_id: planId,
    pillar_key: pillarKey,
    title,
    subject_id: subjectId,
    topic_id: topicId,
    scheduled_date: scheduledDate,
    start_time: startTime,
    end_time: endTime,
    type,
    type_custom: typeCustom,
    note,
    color,
    calendar_task_id: calendarTaskId,
  });
  if (error) return { error: "Não foi possível criar a ação." };

  revalidateCalendarPaths();
  return { error: null };
}

export async function setPlanActionStatusAction(
  actionId: string,
  status: "pending" | "done" | "archived",
): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase.from("monthly_plan_actions").update({ status }).eq("id", actionId).eq("user_id", user.id);
  revalidateCalendarPaths();
}

export async function deletePlanActionAction(actionId: string, alsoDeleteLinkedEvent: boolean): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const { data: action } = await supabase
    .from("monthly_plan_actions")
    .select("user_id, calendar_task_id")
    .eq("id", actionId)
    .maybeSingle();
  if (!action || action.user_id !== user.id) return { error: "Ação não encontrada." };

  if (action.calendar_task_id && alsoDeleteLinkedEvent) {
    await supabase.from("calendar_tasks").delete().eq("id", action.calendar_task_id).eq("user_id", user.id);
  }

  const { error } = await supabase.from("monthly_plan_actions").delete().eq("id", actionId).eq("user_id", user.id);
  if (error) return { error: "Não foi possível excluir a ação." };

  revalidateCalendarPaths();
  return { error: null };
}
