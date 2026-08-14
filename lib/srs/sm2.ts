// Algoritmo SM-2 (o mesmo usado pelo Anki) para repetição espaçada de flashcards.
// Referência: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2

export type ReviewGrade = 0 | 1 | 2; // 0 = não lembrei, 1 = com esforço, 2 = lembrei fácil

export type SRSState = {
  repetitions: number;
  easeFactor: number; // mínimo 1.3
  intervalDays: number;
};

export type SM2Result = SRSState & {
  dueAt: Date;
  lapsed: boolean; // true quando o cartão voltou pra estágio "Novo" nessa revisão
};

const MIN_EASE_FACTOR = 1.3;

export const INITIAL_SRS_STATE: SRSState = {
  repetitions: 0,
  easeFactor: 2.5,
  intervalDays: 0,
};

// Mapeia as 3 notas da UI do produto para a escala de qualidade 0–5 do SM-2
// clássico, preservando o comportamento original do algoritmo (quality < 3
// zera a sequência de repetições).
const GRADE_TO_QUALITY: Record<ReviewGrade, number> = {
  0: 2,
  1: 3,
  2: 5,
};

export function computeSM2(
  state: SRSState,
  grade: ReviewGrade,
  today: Date = new Date(),
): SM2Result {
  const quality = GRADE_TO_QUALITY[grade];
  const lapsed = quality < 3;

  let repetitions: number;
  let intervalDays: number;

  if (lapsed) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = state.repetitions + 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(state.intervalDays * state.easeFactor);
    }
  }

  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    state.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const dueAt = new Date(today);
  dueAt.setDate(dueAt.getDate() + intervalDays);

  return { repetitions, easeFactor, intervalDays, dueAt, lapsed };
}

export type StageLabel = "novo" | "aprendendo" | "consolidado";

// Deriva o rótulo visual (badges .fc-stage, distribuição em Métricas) a
// partir do estado real do SM-2. Limiar de 30 dias vem do texto do próprio
// produto: "Consolidado significa que o Rocket já espaçou a revisão desse
// cartão para 30 dias ou mais".
export function deriveStageLabel(state: Pick<SRSState, "repetitions" | "intervalDays">): StageLabel {
  if (state.repetitions === 0) return "novo";
  if (state.intervalDays < 30) return "aprendendo";
  return "consolidado";
}

export const STAGE_LABEL_PT: Record<StageLabel, string> = {
  novo: "Novo",
  aprendendo: "Aprendendo",
  consolidado: "Consolidado",
};
