// Wrapper do FSRS (Free Spaced Repetition Scheduler) em volta da biblioteca
// ts-fsrs — substitui o SM-2. Referência: manual oficial do Anki sobre FSRS
// e https://github.com/open-spaced-repetition/ts-fsrs
//
// Versão fixada em package.json ("ts-fsrs": "5.4.1", sem ^). Atualizar só
// depois de testes de regressão, conforme o documento de requisitos pede.

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  forgetting_curve,
  Rating,
  State,
  type Card,
  type Grade,
} from "ts-fsrs";

export { Rating, State };
export type { Grade };

export const FSRS_VERSION = "ts-fsrs@5.4.1";

// Retenção desejada inicial de 90% — configurável aqui, sem UI avançada
// exposta pra estudante por enquanto (o documento permite isso
// explicitamente: "mesmo que a configuração avançada não seja apresentada
// inicialmente").
const params = generatorParameters({ request_retention: 0.9, enable_fuzz: true });
const scheduler = fsrs(params);

// Formato salvo em flashcard_srs_state — os mesmos campos do Card do
// ts-fsrs (pra permitir reconstrução exata a cada chamada, já que cada
// Server Action é stateless), mais os campos operacionais (suspensão) que
// ficam de fora por não fazerem parte do estado de memória do FSRS.
export type StoredSrsState = {
  state: State;
  dueAt: string; // ISO
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReviewAt: string | null;
};

export function initialSrsState(now: Date = new Date()): StoredSrsState {
  return cardToStored(createEmptyCard(now));
}

function cardToStored(card: Card): StoredSrsState {
  return {
    state: card.state,
    dueAt: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    lastReviewAt: card.last_review ? card.last_review.toISOString() : null,
  };
}

function storedToCard(stored: StoredSrsState): Card {
  return {
    state: stored.state,
    due: new Date(stored.dueAt),
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: stored.elapsedDays,
    scheduled_days: stored.scheduledDays,
    learning_steps: stored.learningSteps,
    reps: stored.reps,
    lapses: stored.lapses,
    last_review: stored.lastReviewAt ? new Date(stored.lastReviewAt) : undefined,
  };
}

export type GradePreview = {
  rating: Grade;
  scheduledDays: number;
  intervalLabel: string;
};

// As 4 previsões (Esqueci/Difícil/Bom/Fácil) — mostradas em cada botão da
// sessão de revisão antes da escolha. Visualizar não altera o cartão.
export function previewGrades(stored: StoredSrsState, now: Date = new Date()): GradePreview[] {
  const preview = scheduler.repeat(storedToCard(stored), now);
  return ([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]).map((rating) => {
    const { card: nextCard } = preview[rating];
    return { rating, scheduledDays: nextCard.scheduled_days, intervalLabel: formatInterval(nextCard.scheduled_days) };
  });
}

export type ApplyGradeResult = {
  before: StoredSrsState;
  after: StoredSrsState;
  rating: Grade;
  scheduledDays: number;
  intervalLabel: string;
};

// Aplica a nota escolhida e devolve o novo estado — só essa chamada (e
// reiniciar/forget) grava histórico e agendamento novos.
export function applyGrade(stored: StoredSrsState, rating: Grade, now: Date = new Date()): ApplyGradeResult {
  const { card: nextCard } = scheduler.next(storedToCard(stored), now, rating);
  return {
    before: stored,
    after: cardToStored(nextCard),
    rating,
    scheduledDays: nextCard.scheduled_days,
    intervalLabel: formatInterval(nextCard.scheduled_days),
  };
}

// "Reiniciar progresso": o cartão volta ao estado Novo e recebe um
// agendamento novo, exatamente como um cartão recém-criado. O histórico
// anterior não é apagado (fica preservado em review_logs).
export function resetProgress(now: Date = new Date()): StoredSrsState {
  return initialSrsState(now);
}

export function retrievability(stored: StoredSrsState, now: Date = new Date()): number {
  return scheduler.get_retrievability(storedToCard(stored), now, false) as number;
}

// Curva de decaimento pra um dado "stability" — usada pra desenhar a curva
// de retenção do assunto (referência), não o estado real de um cartão.
// forgetting_curve já chama computeDecayFactor internamente — passar um
// decay pré-computado (em vez de params.w) inverte o sinal de novo lá
// dentro e vira NaN pra elapsedDays maiores em relação à stability.
export function retentionPctAt(elapsedDays: number, stabilityDays: number): number {
  return forgetting_curve(params.w, elapsedDays, Math.max(stabilityDays, 0.01)) * 100;
}

function formatInterval(scheduledDays: number): string {
  if (scheduledDays < 1) {
    const minutes = Math.max(1, Math.round(scheduledDays * 24 * 60));
    if (minutes < 60) return `${minutes} min`;
    return `${Math.round(minutes / 60)} h`;
  }
  if (scheduledDays < 2) return "1 dia";
  if (scheduledDays < 30) return `${Math.round(scheduledDays)} dias`;
  if (scheduledDays < 365) {
    const months = Math.round(scheduledDays / 30);
    return months <= 1 ? "1 mês" : `${months} meses`;
  }
  const years = Math.round(scheduledDays / 365);
  return years <= 1 ? "1 ano" : `${years} anos`;
}

export type StageLabel = "novo" | "aprendendo" | "revisao" | "reaprendizagem" | "suspenso";

export function deriveStageLabel(state: State, suspended: boolean): StageLabel {
  if (suspended) return "suspenso";
  if (state === State.New) return "novo";
  if (state === State.Learning) return "aprendendo";
  if (state === State.Relearning) return "reaprendizagem";
  return "revisao";
}

export const STAGE_LABEL_PT: Record<StageLabel, string> = {
  novo: "Novo",
  aprendendo: "Em aprendizagem",
  revisao: "Em revisão",
  reaprendizagem: "Em reaprendizagem",
  suspenso: "Suspenso",
};

// "Consolidado" é uma categoria visual do Rocket, não um estado técnico do
// FSRS: cartão Em revisão com estabilidade de memória de 21 dias ou mais —
// tempo considerado suficiente pra lembrança estar bem fixada. Essa é a
// única regra que decide a categoria (documentada aqui conforme pedido).
const CONSOLIDATED_STABILITY_DAYS = 21;

export function isConsolidated(state: State, stability: number, suspended: boolean): boolean {
  return !suspended && state === State.Review && stability >= CONSOLIDATED_STABILITY_DAYS;
}

// "Precisa de reforço": esquecimentos recorrentes, dificuldade estimada
// alta ou recuperabilidade atual baixa. Sinalização visual apenas — não
// altera o agendamento do FSRS.
const REINFORCE_MIN_LAPSES = 2;
const REINFORCE_MAX_DIFFICULTY = 7;
const REINFORCE_MIN_RETRIEVABILITY = 0.7;

export function needsReinforcement(stored: StoredSrsState, suspended: boolean, now: Date = new Date()): boolean {
  if (suspended || stored.state === State.New) return false;
  if (stored.lapses >= REINFORCE_MIN_LAPSES) return true;
  if (stored.difficulty >= REINFORCE_MAX_DIFFICULTY) return true;
  return retrievability(stored, now) < REINFORCE_MIN_RETRIEVABILITY;
}
