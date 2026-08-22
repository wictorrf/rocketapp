// Motor de fases do Study Time — puramente funções puras (sem I/O, sem
// tempo real), reaproveitadas tanto nas Server Actions quanto no cliente
// pra calcular durações e transições de forma consistente.

export type PomodoroPreset = "pomodoro25" | "pomodoro50";
export type Mode = PomodoroPreset | "simulado";
export type Phase = "foco" | "descanso" | "pausa_longa" | "simulado";

export const PRESETS: Record<PomodoroPreset, { focusMin: number; breakMin: number; longBreakMin: number }> = {
  pomodoro25: { focusMin: 25, breakMin: 5, longBreakMin: 15 },
  pomodoro50: { focusMin: 50, breakMin: 10, longBreakMin: 20 },
};
export const CYCLES_FOR_LONG_BREAK = 4;
export const DEFAULT_SIMULADO_MINUTES = 60;
export const SIMULADO_SHORTCUT_MINUTES = [30, 60, 90, 120] as const;
export const SIMULADO_MAX_MINUTES = 300;

export function initialPhaseFor(mode: Mode): Phase {
  return mode === "simulado" ? "simulado" : "foco";
}

// Sempre um inteiro de segundos — as colunas correspondentes no banco são
// "int", e minutos fracionados (ponto flutuante) fariam o insert falhar.
export function phaseDurationSeconds(mode: Mode, phase: Phase, simuladoMinutes: number): number {
  if (mode === "simulado") return Math.round(simuladoMinutes * 60);
  const preset = PRESETS[mode as PomodoroPreset];
  if (phase === "foco") return Math.round(preset.focusMin * 60);
  if (phase === "pausa_longa") return Math.round(preset.longBreakMin * 60);
  return Math.round(preset.breakMin * 60); // descanso
}

export type PhaseTransition = {
  phase: Phase;
  cycleIndex: number;
  // true só no instante em que o 4º ciclo de foco termina — é quando a
  // mensagem "Sequência concluída!" deve aparecer, distinta do "Ciclo
  // concluído!" dos ciclos 1-3.
  sequenceJustCompleted: boolean;
};

// Calcula a PRÓXIMA fase depois que a atual termina naturalmente — não
// aplica a transição sozinha; a UI sempre pede confirmação da pessoa antes
// de "Iniciar descanso" / "Iniciar próximo ciclo" / "Iniciar pausa longa".
export function nextPhaseAfterCompletion(mode: Mode, phase: Phase, cycleIndex: number): PhaseTransition {
  if (mode === "simulado") {
    return { phase: "simulado", cycleIndex, sequenceJustCompleted: false };
  }
  if (phase === "foco") {
    const nextCycleIndex = cycleIndex + 1;
    const isLong = nextCycleIndex % CYCLES_FOR_LONG_BREAK === 0;
    return { phase: isLong ? "pausa_longa" : "descanso", cycleIndex: nextCycleIndex, sequenceJustCompleted: isLong };
  }
  // descanso ou pausa_longa concluídos -> começa o próximo ciclo de foco
  return { phase: "foco", cycleIndex, sequenceJustCompleted: false };
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export const PHASE_LABEL: Record<Phase, string> = {
  foco: "Tempo de foco",
  descanso: "Tempo de descanso",
  pausa_longa: "Pausa longa",
  simulado: "Simulado",
};

export const ACTIVITY_TYPES = [
  { value: "aula", label: "Aula" },
  { value: "estudo", label: "Estudo" },
  { value: "revisao", label: "Revisão" },
  { value: "flashcards", label: "Flashcards" },
  { value: "questoes", label: "Questões" },
  { value: "simulado_externo", label: "Simulado externo" },
  { value: "resumo", label: "Resumo" },
  { value: "trabalho", label: "Trabalho ou entrega" },
  { value: "outro", label: "Outro" },
] as const;
export type ActivityTypeValue = (typeof ACTIVITY_TYPES)[number]["value"];

export function activityTypeLabel(value: string, custom: string | null): string {
  if (value === "outro" && custom) return custom;
  return ACTIVITY_TYPES.find((a) => a.value === value)?.label ?? value;
}

export const MODE_LABEL: Record<Mode, string> = {
  pomodoro25: "25 / 5",
  pomodoro50: "50 / 10",
  simulado: "Simulado",
};
