import { toLocalDateKey } from "@/lib/utils/format";

// Motor puro de recorrência do Calendário. O projeto não usa RRULE nem
// biblioteca de datas — segue o mesmo padrão já estabelecido (materializar
// linhas reais, uma por ocorrência) só que com um horizonte bem maior que o
// limite antigo de ~3 meses: 2 anos, ou até a data/quantidade escolhida em
// "Personalizada". Isso evita o corte artificial sem prometer recorrência
// literalmente infinita (que exigiria expandir sob demanda a cada leitura).
const HORIZON_DAYS = 730;

export type RecurrenceRule = {
  frequency: "daily" | "weekly" | "monthly" | "custom";
  // 0=domingo..6=sábado. Vazio em "weekly"/"custom" = mesmo dia da semana da data inicial.
  weekdays: number[];
  until: string | null; // YYYY-MM-DD, só considerado quando frequency === "custom"
  count: number | null; // só considerado quando frequency === "custom"
};

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
}

// Retorna as datas (YYYY-MM-DD, ordem cronológica, incluindo a própria data
// inicial) em que a série deve ter uma ocorrência. `rule === null` significa
// evento único — retorna só a data inicial.
export function materializeOccurrenceDates(startDateKey: string, rule: RecurrenceRule | null): string[] {
  if (!rule) return [startDateKey];

  const horizonEnd = addDays(startDateKey, HORIZON_DAYS);
  const untilCap = rule.frequency === "custom" && rule.until ? rule.until : null;
  const effectiveEnd = untilCap && untilCap < horizonEnd ? untilCap : horizonEnd;
  const countCap = rule.frequency === "custom" ? rule.count : null;

  if (rule.frequency === "monthly") {
    const start = new Date(`${startDateKey}T00:00:00`);
    const dayOfMonth = start.getDate();
    const dates: string[] = [];
    for (let i = 0; i < 24; i++) {
      const target = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const lastDayOfTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      target.setDate(Math.min(dayOfMonth, lastDayOfTarget));
      const key = toLocalDateKey(target);
      if (key > effectiveEnd) break;
      dates.push(key);
      if (countCap && dates.length >= countCap) break;
    }
    return dates;
  }

  // daily, weekly e custom (semanal com dias específicos + fim opcional)
  const startWeekday = new Date(`${startDateKey}T00:00:00`).getDay();
  const weekdaysSet = new Set(rule.weekdays.length > 0 ? rule.weekdays : [startWeekday]);

  const dates: string[] = [];
  let cursor = startDateKey;
  let guard = 0;
  while (cursor <= effectiveEnd && guard <= HORIZON_DAYS) {
    guard++;
    const weekday = new Date(`${cursor}T00:00:00`).getDay();
    const matches = rule.frequency === "daily" || weekdaysSet.has(weekday);
    if (matches) {
      dates.push(cursor);
      if (countCap && dates.length >= countCap) break;
    }
    cursor = addDays(cursor, 1);
  }
  return dates;
}
