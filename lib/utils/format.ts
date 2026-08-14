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

// Colunas `date` do Postgres vêm como "YYYY-MM-DD", sem horário/fuso. Usar
// `new Date(str)` interpreta isso como meia-noite UTC, o que "volta" um dia
// em fusos atrás de UTC (ex: Brasil) — por isso parseamos como data local.
function parseLocalDateOnly(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Inverso: formata um Date como "YYYY-MM-DD" no fuso local (não em UTC como
// `toISOString()` faz) — pra agrupar/comparar por "dia local do usuário".
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Formata "daqui a quanto tempo" pra datas futuras (ex: próxima revisão prevista).
export function formatDueIn(dueAtDateOnly: string): string {
  const due = parseLocalDateOnly(dueAtDateOnly);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays <= 0) return "hoje";
  if (diffDays === 1) return "amanhã";
  return `em ${diffDays} dias`;
}

export function isOverdue(dueAtDateOnly: string): boolean {
  const due = parseLocalDateOnly(dueAtDateOnly);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}
