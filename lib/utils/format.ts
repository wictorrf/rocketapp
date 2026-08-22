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

// Inverso: formata um Date como "YYYY-MM-DD" no fuso local (não em UTC como
// `toISOString()` faz) — pra agrupar/comparar por "dia local do usuário".
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
