export type CalendarTaskType = "prova" | "questoes" | "contato" | "aula";

export const TASK_TYPE_OPTIONS: { value: CalendarTaskType; label: string; defaultColor: string }[] = [
  { value: "prova", label: "Prova/Simulado", defaultColor: "#6E1E33" },
  { value: "questoes", label: "Questões", defaultColor: "#17181A" },
  { value: "contato", label: "Primeiro contato", defaultColor: "#F2A6C1" },
  { value: "aula", label: "Aula", defaultColor: "#C98A2C" },
];

export const TASK_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TASK_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export const DEFAULT_COLOR_BY_TYPE: Record<string, string> = Object.fromEntries(
  TASK_TYPE_OPTIONS.map((o) => [o.value, o.defaultColor]),
);

// Cobre também os tipos "sistêmicos" (revisão/ritual), que não aparecem no
// seletor de tipo do modal de novo evento mas precisam de cor pro painel de
// detalhes do dia.
export const FULL_DEFAULT_COLOR_BY_TYPE: Record<string, string> = {
  ...DEFAULT_COLOR_BY_TYPE,
  revisao: "#4C8B6E",
  ritual: "#4E1524",
};

export function resolveTaskColor(task: { type: string; color: string | null }): string {
  return task.color ?? FULL_DEFAULT_COLOR_BY_TYPE[task.type] ?? "#6B6F76";
}

export const COLOR_SWATCHES = [
  { value: "#6E1E33", label: "Vinho" },
  { value: "#F2A6C1", label: "Rosa" },
  { value: "#C98A2C", label: "Âmbar" },
  { value: "#4C8B6E", label: "Verde" },
  { value: "#17181A", label: "Carvão" },
  { value: "#4E1524", label: "Vinho escuro" },
];

export const EMOJI_QUICK_PICKS = [
  "📚", "🩺", "🧠", "❤️", "🫁", "💉", "📝", "🔬", "⏰", "🎯", "✅", "📅", "🧪", "🏥", "💊",
];

export const WEEKDAY_LABEL_LONG_PT = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado",
];
