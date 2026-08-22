import { createClient } from "@/lib/supabase/server";
import { State, previewGrades, type GradePreview, type StoredSrsState } from "@/lib/srs/fsrs";

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

export type DueTopicSummary = {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  dueCount: number;
};

// Resumo por assunto dos cartões vencidos — alimenta o hub de Flashcards
// ("revisar cada tema separado").
export async function getDueSummaryByTopic(userId: string): Promise<DueTopicSummary[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("flashcards")
    .select("id, topic_id, flashcard_srs_state!inner(due_at, suspended_at)")
    .eq("user_id", userId)
    .is("flashcard_srs_state.suspended_at", null)
    .lte("flashcard_srs_state.due_at", nowIso);

  if (!data?.length) return [];

  const countByTopic = new Map<string, number>();
  for (const f of data) countByTopic.set(f.topic_id, (countByTopic.get(f.topic_id) ?? 0) + 1);

  const topicIds = [...countByTopic.keys()];
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in("id", topicIds);

  const subjectIds = [...new Set((topics ?? []).map((t) => t.subject_id))];
  const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return (topics ?? [])
    .map((t) => ({
      subjectId: t.subject_id,
      subjectName: subjectNameById.get(t.subject_id) ?? "",
      topicId: t.id,
      topicName: t.name,
      dueCount: countByTopic.get(t.id) ?? 0,
    }))
    .sort((a, b) => b.dueCount - a.dueCount);
}
