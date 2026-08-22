// Separado de lib/queries/questions.ts de propósito: esse arquivo não importa
// nada de servidor, então pode ser usado direto por componentes client.
export type QuestionLogType = "questoes" | "simulado_externo" | "prova_antiga" | "outro";

export const QUESTION_LOG_TYPE_LABEL: Record<QuestionLogType, string> = {
  questoes: "Questões",
  simulado_externo: "Simulado externo",
  prova_antiga: "Prova antiga",
  outro: "Outro",
};
