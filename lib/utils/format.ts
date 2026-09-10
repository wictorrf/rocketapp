// Formata "há quanto tempo" em português, no estilo usado em Disciplinas/Assunto.
export function formatRelativeDays(iso: string | null): string {
  if (!iso) return "nunca revisado";
  const date = new Date(iso);
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);

  if (diffDays <= 0) return "hoje";
  if (diffDays === 1) return "há 1 dia";
  return `há ${diffDays} dias`;
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  if (hours < 1) return `${minutes}min`;
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`;
}

// Formata um Date como "YYYY-MM-DD" no fuso informado — pra agrupar/comparar
// por "dia local da usuária" (não do servidor, e não UTC como
// `toISOString()` faz). `timeZone` é obrigatório de propósito: força quem
// chama a decidir explicitamente se quer o fuso real da usuária (leia de
// getUserTimezone) ou um fuso fixo pra aritmética pura de datas (ver
// dateKeyToUtcDate/addDaysToKey abaixo).
export function toLocalDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Pra aritmética de datas que não tem nada a ver com "agora" (materializar
// ocorrências de recorrência, somar dias a uma chave já conhecida) — ancora
// em UTC dos dois lados (construção e leitura) pra nunca depender do fuso do
// servidor nem da usuária, e nunca arriscar virar o dia por causa de um
// fuso incorreto no meio do caminho.
export function dateKeyToUtcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00Z`);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const d = dateKeyToUtcDate(dateKey);
  d.setUTCDate(d.getUTCDate() + days);
  return toLocalDateKey(d, "UTC");
}

// Formata "daqui a quanto tempo" pra datas/horas futuras (ex: próxima
// revisão de flashcard, com o FSRS podendo agendar em minutos/horas dentro
// do mesmo dia, não só em dias inteiros).
export function formatDueIn(dueAtIso: string): string {
  const due = new Date(dueAtIso);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();

  if (diffMs <= 0) return "hoje";
  if (diffMs < 3_600_000) return `em ${Math.max(1, Math.round(diffMs / 60_000))} min`;
  if (diffMs < 86_400_000 && due.getDate() === now.getDate()) return `em ${Math.round(diffMs / 3_600_000)} h`;

  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  if (diffDays <= 0) return "hoje";
  if (diffDays === 1) return "amanhã";
  return `em ${diffDays} dias`;
}

export function isOverdue(dueAtIso: string): boolean {
  return new Date(dueAtIso).getTime() < Date.now();
}
