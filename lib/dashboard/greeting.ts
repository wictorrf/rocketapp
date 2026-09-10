// Saudação e data do cabeçalho do Dashboard — funções puras, sem I/O.
import type { GenderTreatment } from "@/lib/queries/profile";

// "a" -> feminino, "o" -> masculino, "x"/null -> forma neutra. O gênero
// nunca é inferido do nome — só usa o que a pessoa escolheu no perfil.
export function greetingFor(firstName: string, genderTreatment: GenderTreatment | null): string {
  if (genderTreatment === "a") return `Bem-vinda de volta, ${firstName}!`;
  if (genderTreatment === "o") return `Bem-vindo de volta, ${firstName}!`;
  return `Olá, ${firstName}! Que bom ter você de volta.`;
}

// "Quinta-feira, 20 de agosto de 2026" — no fuso informado (da usuária, via
// getUserTimezone), não no fuso do servidor.
export function formatFullDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("pt-BR", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${weekdayCap}, ${get("day")} de ${get("month")} de ${get("year")}`;
}
