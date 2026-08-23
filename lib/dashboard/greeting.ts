// Saudação e data do cabeçalho do Dashboard — funções puras, sem I/O.
import { MONTH_NAMES_PT } from "@/lib/metrics/calc";
import type { GenderTreatment } from "@/lib/queries/profile";

const WEEKDAY_NAMES_PT = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado",
];

// "a" -> feminino, "o" -> masculino, "x"/null -> forma neutra. O gênero
// nunca é inferido do nome — só usa o que a pessoa escolheu no perfil.
export function greetingFor(firstName: string, genderTreatment: GenderTreatment | null): string {
  if (genderTreatment === "a") return `Bem-vinda de volta, ${firstName}!`;
  if (genderTreatment === "o") return `Bem-vindo de volta, ${firstName}!`;
  return `Olá, ${firstName}! Que bom ter você de volta.`;
}

// "Quinta-feira, 20 de agosto de 2026" — no fuso local do navegador do
// servidor (o mesmo usado pelo resto do app pra "hoje").
export function formatFullDate(date: Date): string {
  const weekday = WEEKDAY_NAMES_PT[date.getDay()];
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${weekdayCap}, ${date.getDate()} de ${MONTH_NAMES_PT[date.getMonth()]} de ${date.getFullYear()}`;
}
