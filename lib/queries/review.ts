import { createClient } from "@/lib/supabase/server";
import {
  State,
  previewGrades,
  deriveStageLabel,
  deriveStageBreakdownLabel,
  isConsolidated,
  needsReinforcement,
  retrievability,
  estimateReviewMinutes,
  formatInterval,
  daysBetween,
  type Grade,
  type GradePreview,
  type StoredSrsState,
  type StageBreakdownLabel,
} from "@/lib/srs/fsrs";
import { toLocalDateKey, addDaysToKey, dateKeyToUtcDate } from "@/lib/utils/format";
import { startOfDayInTimeZone } from "@/lib/utils/timezone";
import { resolvePeriodRange, bucketDates, type DayBar } from "@/lib/metrics/calc";

// Limite diário de cartões Novos incluídos numa fila — aproximação simples
// (não rastreia "quantos novos já foram iniciados hoje" entre sessões
// diferentes, só limita quantos entram de uma vez ao montar a fila).
const DAILY_NEW_CARDS_LIMIT = 20;
const QUEUE_MAX_SIZE = 200;

export type ReviewCard = {
  id: string;
  front: string;
  back: string;
  imageUrl: string | null;
  backImageUrl: string | null;
  topicName?: string;
  subjectName?: string;
  previews: GradePreview[];
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
};

export type QueueComposition = { overdue: number; dueToday: number; newCards: number };

type RawSrsFields = {
  due_at: string;
  state: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review_at: string | null;
  suspended_at: string | null;
};

type RawFlashcardRow = {
  id: string;
  front: string;
  back: string;
  image_url: string | null;
  back_image_url: string | null;
  topic_id: string;
  flashcard_srs_state: RawSrsFields | RawSrsFields[];
};

function srsOf(row: RawFlashcardRow): RawSrsFields {
  return Array.isArray(row.flashcard_srs_state) ? row.flashcard_srs_state[0] : row.flashcard_srs_state;
}

function toStoredState(srs: RawSrsFields): StoredSrsState {
  return {
    state: srs.state,
    dueAt: srs.due_at,
    stability: srs.stability,
    difficulty: srs.difficulty,
    elapsedDays: srs.elapsed_days,
    scheduledDays: srs.scheduled_days,
    learningSteps: srs.learning_steps,
    reps: srs.reps,
    lapses: srs.lapses,
    lastReviewAt: srs.last_review_at,
  };
}

const SRS_SELECT =
  "due_at, state, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, last_review_at, suspended_at";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Prioridade: atrasados/previstos pra hoje (mais antigos primeiro), depois
// novos disponíveis dentro do limite diário. Novos não ocupam o lugar de
// revisões pendentes mais importantes.
function buildQueue(rows: RawFlashcardRow[]): RawFlashcardRow[] {
  const reviewRows = rows
    .filter((r) => srsOf(r).state !== State.New)
    .sort((a, b) => srsOf(a).due_at.localeCompare(srsOf(b).due_at));
  const newRows = rows.filter((r) => srsOf(r).state === State.New).slice(0, DAILY_NEW_CARDS_LIMIT);
  return [...reviewRows, ...newRows].slice(0, QUEUE_MAX_SIZE);
}

function summarizeQueue(queue: RawFlashcardRow[], nowIso: string): QueueComposition {
  let overdue = 0;
  let dueToday = 0;
  let newCards = 0;
  for (const row of queue) {
    const srs = srsOf(row);
    if (srs.state === State.New) newCards += 1;
    else if (srs.due_at < nowIso) overdue += 1;
    else dueToday += 1;
  }
  return { overdue, dueToday, newCards };
}

export type ReviewQueue = { cards: ReviewCard[]; composition: QueueComposition };

// Cartões previstos pra hoje (due_at <= agora), atrasados primeiro — fila
// usada pela sessão de revisão de um único assunto.
export async function getDueFlashcardsForReview(topicId: string): Promise<ReviewQueue> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("flashcards")
    .select(`id, front, back, image_url, back_image_url, topic_id, flashcard_srs_state!inner(${SRS_SELECT})`)
    .eq("topic_id", topicId)
    .is("flashcard_srs_state.suspended_at", null)
    .lte("flashcard_srs_state.due_at", nowIso);

  const queue = buildQueue((data ?? []) as RawFlashcardRow[]);
  return {
    cards: queue.map((f) => ({
      id: f.id,
      front: f.front,
      back: f.back,
      imageUrl: f.image_url,
      backImageUrl: f.back_image_url,
      previews: previewGrades(toStoredState(srsOf(f))),
      stability: srsOf(f).stability,
      difficulty: srsOf(f).difficulty,
      reps: srsOf(f).reps,
      lapses: srsOf(f).lapses,
    })),
    composition: summarizeQueue(queue, nowIso),
  };
}

// Fila "revisar tudo misturado" — todos os cartões vencidos da usuária, de
// qualquer disciplina/assunto, cada um com o contexto de onde vem.
export async function getAllDueFlashcardsForUser(userId: string): Promise<ReviewQueue> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("flashcards")
    .select(`id, front, back, image_url, back_image_url, topic_id, flashcard_srs_state!inner(${SRS_SELECT})`)
    .eq("user_id", userId)
    .is("flashcard_srs_state.suspended_at", null)
    .lte("flashcard_srs_state.due_at", nowIso);

  const queue = buildQueue((data ?? []) as RawFlashcardRow[]);
  const composition = summarizeQueue(queue, nowIso);
  if (!queue.length) return { cards: [], composition };

  const topicIds = [...new Set(queue.map((f) => f.topic_id))];
  const { data: topics } = await supabase.from("topics").select("id, name, subject_id").in("id", topicIds);
  const topicById = new Map((topics ?? []).map((t) => [t.id, t]));

  const subjectIds = [...new Set((topics ?? []).map((t) => t.subject_id))];
  const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  const cards: ReviewCard[] = queue.map((f) => {
    const topic = topicById.get(f.topic_id);
    return {
      id: f.id,
      front: f.front,
      back: f.back,
      imageUrl: f.image_url,
      backImageUrl: f.back_image_url,
      topicName: topic?.name,
      subjectName: topic ? subjectNameById.get(topic.subject_id) : undefined,
      previews: previewGrades(toStoredState(srsOf(f))),
      stability: srsOf(f).stability,
      difficulty: srsOf(f).difficulty,
      reps: srsOf(f).reps,
      lapses: srsOf(f).lapses,
    };
  });

  // buildQueue já ordenou revisões (atrasadas primeiro) antes dos novos —
  // embaralha só dentro de cada bloco, pra misturar disciplinas sem que
  // cartões novos "furem a fila" na frente de revisões pendentes.
  const reviewCount = queue.filter((f) => srsOf(f).state !== State.New).length;
  const reviewCards = cards.slice(0, reviewCount);
  const newCards = cards.slice(reviewCount);
  return { cards: [...shuffle(reviewCards), ...shuffle(newCards)], composition };
}

export type TopicHubStatus =
  | "revisar_hoje"
  | "atrasado"
  | "novo"
  | "aprendendo"
  | "revisao"
  | "reaprendizagem"
  | "suspenso"
  | "consolidado"
  | "precisa_reforco"
  | "em_dia";

export type TopicHubSummary = {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  totalActive: number;
  overdueCount: number;
  dueTodayCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  relearningCount: number;
  suspendedCount: number;
  needsReinforcementCount: number;
  estimatedMinutes: number;
  lastActivityAt: string | null;
  /** menor recuperabilidade estimada entre os cartões pendentes (atrasados/hoje) — null quando não há pendentes */
  worstRecuperability: number | null;
  statuses: TopicHubStatus[];
};

// Resumo por assunto pra página geral de Flashcards — parte de TODOS os
// assuntos ativos com pelo menos um cartão (não só os com pendência), pra
// quem está em dia continuar aparecendo com esse status em vez de sumir da
// lista. Uma única leitura em lote de flashcards+estado (sem N+1 por assunto).
export async function getFlashcardsHubSummary(userId: string, timeZone: string): Promise<TopicHubSummary[]> {
  const supabase = await createClient();
  const now = new Date();
  const todayKey = toLocalDateKey(now, timeZone);
  const startOfToday = startOfDayInTimeZone(todayKey, timeZone);
  const endOfToday = new Date(startOfDayInTimeZone(addDaysToKey(todayKey, 1), timeZone).getTime() - 1);

  const [{ data: subjects }, { data: topics }, { data: flashcards }] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("user_id", userId).is("archived_at", null),
    supabase.from("topics").select("id, name, subject_id").eq("user_id", userId).is("archived_at", null),
    supabase.from("flashcards").select(`id, topic_id, flashcard_srs_state(${SRS_SELECT})`).eq("user_id", userId),
  ]);

  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const cardsByTopic = new Map<string, RawFlashcardRow[]>();
  for (const f of (flashcards ?? []) as RawFlashcardRow[]) {
    const list = cardsByTopic.get(f.topic_id);
    if (list) list.push(f);
    else cardsByTopic.set(f.topic_id, [f]);
  }

  const summaries: TopicHubSummary[] = [];
  for (const t of topics ?? []) {
    const cards = cardsByTopic.get(t.id);
    if (!cards || cards.length === 0) continue; // só assuntos "com cartões"

    let totalActive = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;
    let newCount = 0;
    let learningCount = 0;
    let reviewCount = 0;
    let relearningCount = 0;
    let suspendedCount = 0;
    let consolidatedCount = 0;
    let needsReinforcementCount = 0;
    let lastActivityAt: string | null = null;
    let worstRecuperability: number | null = null;

    for (const f of cards) {
      const srs = srsOf(f);
      const suspended = Boolean(srs.suspended_at);
      if (srs.last_review_at && (!lastActivityAt || srs.last_review_at > lastActivityAt)) {
        lastActivityAt = srs.last_review_at;
      }
      if (suspended) {
        suspendedCount += 1;
        continue;
      }
      totalActive += 1;
      const stored = toStoredState(srs);
      const stage = deriveStageLabel(srs.state, false);
      if (stage === "aprendendo") learningCount += 1;
      else if (stage === "revisao") reviewCount += 1;
      else if (stage === "reaprendizagem") relearningCount += 1;
      if (isConsolidated(srs.state, srs.stability, false)) consolidatedCount += 1;
      if (needsReinforcement(stored, false, now)) needsReinforcementCount += 1;

      const dueAt = new Date(srs.due_at);
      if (srs.state === State.New) {
        newCount += 1;
      } else if (dueAt < startOfToday) {
        overdueCount += 1;
        worstRecuperability = Math.min(worstRecuperability ?? 1, retrievability(stored, now));
      } else if (dueAt <= endOfToday) {
        dueTodayCount += 1;
        worstRecuperability = Math.min(worstRecuperability ?? 1, retrievability(stored, now));
      }
    }

    const statuses = new Set<TopicHubStatus>();
    if (overdueCount > 0) statuses.add("atrasado");
    if (dueTodayCount > 0) statuses.add("revisar_hoje");
    if (newCount > 0) statuses.add("novo");
    if (learningCount > 0) statuses.add("aprendendo");
    if (reviewCount > 0) statuses.add("revisao");
    if (relearningCount > 0) statuses.add("reaprendizagem");
    if (suspendedCount > 0) statuses.add("suspenso");
    if (consolidatedCount > 0) statuses.add("consolidado");
    if (needsReinforcementCount > 0) statuses.add("precisa_reforco");
    if (overdueCount === 0 && dueTodayCount === 0 && newCount === 0 && totalActive > 0) statuses.add("em_dia");

    summaries.push({
      subjectId: t.subject_id,
      subjectName: subjectNameById.get(t.subject_id) ?? "",
      topicId: t.id,
      topicName: t.name,
      totalActive,
      overdueCount,
      dueTodayCount,
      newCount,
      learningCount,
      reviewCount,
      relearningCount,
      suspendedCount,
      needsReinforcementCount,
      estimatedMinutes: estimateReviewMinutes(overdueCount + dueTodayCount + newCount),
      lastActivityAt,
      worstRecuperability,
      statuses: [...statuses],
    });
  }

  return summaries;
}

export type ReviewHistoryEntry = {
  rating: Grade;
  reviewedAt: string;
  intervalLabel: string;
};

const REVIEW_HISTORY_LIMIT = 10;

// Histórico recente de um cartão específico, usado pelo "Ver detalhes" da
// sessão de revisão — buscado sob demanda (só quando a pessoa abre o
// painel), não junto da fila inteira.
export async function getFlashcardReviewHistory(flashcardId: string): Promise<ReviewHistoryEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("review_logs")
    .select("rating, reviewed_at, due_after")
    .eq("flashcard_id", flashcardId)
    .order("reviewed_at", { ascending: false })
    .limit(REVIEW_HISTORY_LIMIT);

  return (data ?? []).map((r) => ({
    rating: r.rating as Grade,
    reviewedAt: r.reviewed_at,
    // A partir das datas reais (não de scheduled_days, que o ts-fsrs zera
    // durante passos de aprendizagem) — corrige retroativamente o histórico
    // já salvo, sem precisar de migração de dados.
    intervalLabel: formatInterval(daysBetween(new Date(r.reviewed_at), new Date(r.due_after))),
  }));
}

export type FlashcardHubEvolution = { week: DayBar[]; month: DayBar[]; year: DayBar[] };

// "Constância de revisão" recente pro hub de Flashcards — sempre o recorte
// ATUAL (semana/mês/ano correntes), sem navegação pra período anterior (isso
// é papel de Métricas). Uma consulta por recorte, já filtrada pelo range certo.
export async function getFlashcardReviewEvolution(userId: string, timeZone: string): Promise<FlashcardHubEvolution> {
  const supabase = await createClient();
  const todayKey = toLocalDateKey(new Date(), timeZone);
  const [year, month] = todayKey.split("-").map(Number);
  const weekRange = resolvePeriodRange("week", { year, month, weekDateKey: todayKey });
  const monthRange = resolvePeriodRange("month", { year, month, weekDateKey: null });
  const yearRange = resolvePeriodRange("year", { year, month, weekDateKey: null });

  async function fetchReviewedAt(start: Date | null, end: Date): Promise<string[]> {
    let q = supabase.from("review_logs").select("reviewed_at").eq("user_id", userId).lt("reviewed_at", end.toISOString());
    if (start) q = q.gte("reviewed_at", start.toISOString());
    const { data } = await q;
    return (data ?? []).map((r) => r.reviewed_at);
  }

  const [weekLogs, monthLogs, yearLogs] = await Promise.all([
    fetchReviewedAt(weekRange.start, weekRange.end),
    fetchReviewedAt(monthRange.start, monthRange.end),
    fetchReviewedAt(yearRange.start, yearRange.end),
  ]);

  return {
    week: bucketDates(weekLogs, weekRange, "day"),
    month: bucketDates(monthLogs, monthRange, "day"),
    year: bucketDates(yearLogs, yearRange, "month"),
  };
}

const FORECAST_DAYS = 7;
const WEEKDAY_SHORT_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// "Carga futura de revisão" — quantos cartões vencem em cada um dos próximos
// dias, pra estudante se organizar. Feature nova (documento de requisitos de
// Flashcards), sem precedente em Métricas.
export async function getUpcomingReviewLoad(userId: string, timeZone: string): Promise<DayBar[]> {
  const supabase = await createClient();
  const todayKey = toLocalDateKey(new Date(), timeZone);
  const startIso = startOfDayInTimeZone(todayKey, timeZone).toISOString();
  const endIso = startOfDayInTimeZone(addDaysToKey(todayKey, FORECAST_DAYS), timeZone).toISOString();

  const { data } = await supabase
    .from("flashcard_srs_state")
    .select("due_at, suspended_at, flashcards!inner(user_id)")
    .eq("flashcards.user_id", userId)
    .is("suspended_at", null)
    .gte("due_at", startIso)
    .lt("due_at", endIso);

  const buckets = new Map<string, number>();
  for (let i = 0; i < FORECAST_DAYS; i++) buckets.set(addDaysToKey(todayKey, i), 0);
  for (const row of data ?? []) {
    const key = toLocalDateKey(new Date(row.due_at), timeZone);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()].map(([key, value]) => ({
    key,
    label: WEEKDAY_SHORT_PT[dateKeyToUtcDate(key).getUTCDay()],
    value,
  }));
}

// Distribuição de estágio de todos os cartões da usuária, sempre "agora" (sem
// período/filtro) — alimenta "Estágio dos cartões" no hub de Flashcards.
// Mesma regra de Consolidados-no-lugar-de-Suspenso usada em Métricas.
export async function getFlashcardStageDistribution(userId: string): Promise<Record<StageBreakdownLabel, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("flashcard_srs_state")
    .select("state, stability, suspended_at, flashcards!inner(user_id)")
    .eq("flashcards.user_id", userId);

  const distribution: Record<StageBreakdownLabel, number> = { novo: 0, aprendendo: 0, revisao: 0, reaprendizagem: 0, consolidado: 0 };
  for (const row of data ?? []) {
    const suspended = Boolean(row.suspended_at);
    const stage = deriveStageBreakdownLabel(row.state as State, row.stability, suspended);
    distribution[stage] += 1;
  }
  return distribution;
}
