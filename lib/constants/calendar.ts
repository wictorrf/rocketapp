import { ENTITY_COLORS } from "@/lib/constants/entity-colors";

export type CalendarTaskType =
  | "aula"
  | "estudo"
  | "revisao"
  | "questoes"
  | "prova"
  | "trabalho"
  | "compromisso"
  | "pessoal"
  | "outro";

export const TASK_TYPE_OPTIONS: { value: CalendarTaskType; label: string }[] = [
  { value: "aula", label: "Aula" },
  { value: "estudo", label: "Estudo" },
  { value: "revisao", label: "Revisão" },
  { value: "questoes", label: "Questões" },
  { value: "prova", label: "Prova ou simulado" },
  { value: "trabalho", label: "Trabalho ou entrega" },
  { value: "compromisso", label: "Compromisso acadêmico" },
  { value: "pessoal", label: "Pessoal" },
  { value: "outro", label: "Outro" },
];

export const TASK_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TASK_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

const hex = (id: (typeof ENTITY_COLORS)[number]["id"]) => ENTITY_COLORS.find((c) => c.id === id)!.hex;

export const DEFAULT_COLOR_BY_TYPE: Record<CalendarTaskType, string> = {
  aula: hex("orange"),
  estudo: hex("blue"),
  revisao: hex("green"),
  questoes: hex("gray"),
  prova: hex("wine"),
  trabalho: hex("purple"),
  compromisso: hex("blue-light"),
  pessoal: hex("lavender"),
  outro: hex("brown"),
};

// Revisões automáticas do FSRS (origin "fsrs") sempre chegam com
// type: "revisao" e color: null — caem no default de "revisao" (verde) aqui.
export function resolveTaskColor(task: { type: string; color: string | null }): string {
  return task.color ?? DEFAULT_COLOR_BY_TYPE[task.type as CalendarTaskType] ?? "#6B6F76";
}

export const WEEKDAY_LABEL_LONG_PT = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado",
];

export const WEEKDAY_LABEL_SHORT_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Segunda a domingo, na ordem que o Calendário usa (diferente do array acima,
// que começa no domingo por conveniência de indexação com Date.getDay()).
export const WEEKDAY_LABEL_MON_FIRST_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export type RepeatFrequency = "none" | "daily" | "weekly" | "monthly" | "custom";

export const REPEAT_OPTIONS: { value: RepeatFrequency; label: string }[] = [
  { value: "none", label: "Não repetir" },
  { value: "daily", label: "Diariamente" },
  { value: "weekly", label: "Semanalmente" },
  { value: "monthly", label: "Mensalmente" },
  { value: "custom", label: "Personalizada" },
];

export type EditScope = "this" | "future" | "all";
export type DeleteScope = "this" | "future" | "all";
