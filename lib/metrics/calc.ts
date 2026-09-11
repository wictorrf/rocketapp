// Regras de cálculo compartilhadas entre o Dashboard e as Métricas — o
// documento de requisitos exige que os dois usem exatamente a mesma
// fórmula pra nunca divergir. Funções puras, sem I/O.

import { Rating } from "@/lib/srs/fsrs";
import { toLocalDateKey } from "@/lib/utils/format";

// resolvePeriodRange (mais abaixo) monta os limites de período com `new
// Date(ano, mês, dia)` — fuso implícito do runtime do servidor, não da
// usuária. As funções de bucket/dedup abaixo caminham dia a dia a partir
// desses limites com os mesmos métodos locais, então precisam ler de volta
// nesse MESMO fuso pra não desalinhar — não é o fuso "certo" da usuária
// (esse fica em lib/utils/timezone.ts, usado pra "hoje"), só o fuso
// consistente com o resto desta função.
const RUNTIME_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export type MetricsPeriod = "week" | "month" | "year" | "all";

export const PERIOD_LABEL: Record<MetricsPeriod, string> = {
  week: "Semanal",
  month: "Mensal",
  year: "Anual",
  all: "Todo o período",
};

// Primeiro ano com dados possíveis no Rocket — usado pro seletor de anos.
export const FIRST_YEAR = 2026;

export type PeriodAnchor = { year: number; month: number; week: string | null };

export type PeriodRange = {
  /** null = sem início (Todo o período) */
  start: Date | null;
  /** exclusivo */
  end: Date;
  rangeLabel: string;
  previous: { start: Date | null; end: Date } | null;
};

function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - offset);
  return d;
}

export const MONTH_NAMES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// Resolve o intervalo [start, end) do período atual e do período anterior de
// mesma duração, pra comparação. `anchorWeekKey` é a data (YYYY-MM-DD) de
// qualquer dia dentro da semana desejada quando period === "week".
export function resolvePeriodRange(
  period: MetricsPeriod,
  anchor: { year: number; month: number; weekDateKey: string | null },
): PeriodRange {
  if (period === "week") {
    const anchorDate = anchor.weekDateKey ? new Date(`${anchor.weekDateKey}T00:00:00`) : new Date();
    const start = mondayOf(anchorDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    const endLabel = new Date(end);
    endLabel.setDate(endLabel.getDate() - 1);
    return {
      start,
      end,
      rangeLabel: `${formatDayMonth(start)} a ${formatDayMonth(endLabel)}`,
      previous: { start: prevStart, end: start },
    };
  }
  if (period === "month") {
    const start = new Date(anchor.year, anchor.month - 1, 1);
    const end = new Date(anchor.year, anchor.month, 1);
    const prevStart = new Date(anchor.year, anchor.month - 2, 1);
    return {
      start,
      end,
      rangeLabel: `${MONTH_NAMES_PT[anchor.month - 1]} de ${anchor.year}`,
      previous: { start: prevStart, end: start },
    };
  }
  if (period === "year") {
    const start = new Date(anchor.year, 0, 1);
    const end = new Date(anchor.year + 1, 0, 1);
    const prevStart = new Date(anchor.year - 1, 0, 1);
    return {
      start,
      end,
      rangeLabel: `${anchor.year}`,
      previous: { start: prevStart, end: start },
    };
  }
  return { start: null, end: new Date(8640000000000000), rangeLabel: "Todo o período", previous: null };
}

function formatDayMonth(d: Date): string {
  return `${d.getDate()} de ${MONTH_NAMES_PT[d.getMonth()]}`;
}

export function isoOf(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

// Um flashcard foi "lembrado" quando a nota for qualquer coisa além de
// Esqueci (Rating.Again é a única nota tratada como falha de recordação).
export function isRemembered(rating: number): boolean {
  return rating > Rating.Again;
}

// % de acertos ponderada: soma de acertos / soma de respondidas — nunca a
// média simples das porcentagens individuais (distorce quando os registros
// têm tamanhos bem diferentes).
export function weightedAccuracyPct(correct: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((correct / total) * 100);
}

// Retenção observada não pode contar duas vezes o mesmo cartão revisado
// mais de uma vez no mesmo dia local (comum quando o FSRS reagenda um
// "Esqueci" pra minutos/horas depois, dentro do mesmo dia) — só a primeira
// revisão válida de cada cartão em cada dia entra na taxa principal.
export function firstReviewPerCardPerDay<T>(
  rows: T[],
  getCardId: (row: T) => string,
  getReviewedAtIso: (row: T) => string,
): T[] {
  const seen = new Map<string, T>();
  for (const row of rows) {
    const key = `${getCardId(row)}::${toLocalDateKey(new Date(getReviewedAtIso(row)), RUNTIME_TZ)}`;
    const existing = seen.get(key);
    if (!existing || getReviewedAtIso(row) < getReviewedAtIso(existing)) seen.set(key, row);
  }
  return [...seen.values()];
}

// "45min" quando < 1h, "2h 35min" quando >= 1h (nunca decimal) — formato
// pedido explicitamente pelo documento de Métricas.
export function formatStudyDuration(totalMinutes: number): string {
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}

export type Comparison = { deltaAbs: number; deltaPct: number | null; direction: "up" | "down" | "flat" } | null;

// Compara valor atual com o período anterior de mesma duração. Retorna null
// quando não há período anterior pra comparar (period === "all") ou quando o
// valor anterior é zero (percentual infinito/enganoso) — nesses casos a UI
// deve mostrar "Sem período anterior para comparação" em vez de um número.
export function compareToPrevious(current: number, previous: number | null): Comparison {
  if (previous === null || previous === 0) return null;
  const deltaAbs = current - previous;
  const deltaPct = Math.round((deltaAbs / previous) * 100);
  const direction = deltaAbs > 0 ? "up" : deltaAbs < 0 ? "down" : "flat";
  return { deltaAbs, deltaPct, direction };
}

// Chave de agrupamento por dia/mês pros gráficos de evolução, conforme a
// granularidade de cada período (dia pra semana/mês, mês pra ano/todo o
// período).
export function evolutionBucketKey(iso: string, granularity: "day" | "month"): string {
  const d = new Date(iso);
  if (granularity === "day") return toLocalDateKey(d, RUNTIME_TZ);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function granularityFor(period: MetricsPeriod): "day" | "month" {
  return period === "year" || period === "all" ? "month" : "day";
}

export type DayBar = { key: string; label: string; value: number };

const MONTH_SHORT_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function bucketLabel(key: string, granularity: "day" | "month"): string {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return `${MONTH_SHORT_PT[Number(m) - 1]}/${y.slice(2)}`;
  }
  const d = new Date(`${key}T00:00:00`);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Monta a série com todos os baldes do período já zerados (pra dia sem
// revisão/questão/estudo aparecer como zero verdadeiro, não como ausência),
// depois soma cada ocorrência no balde certo. Sem início definido (Todo o
// período), os baldes nascem só a partir dos dados encontrados.
export function bucketDates(dates: string[], range: PeriodRange, granularity: "day" | "month"): DayBar[] {
  const map = new Map<string, number>();
  if (range.start) {
    const cursor = new Date(range.start);
    if (granularity === "month") cursor.setDate(1);
    while (cursor < range.end) {
      map.set(evolutionBucketKey(cursor.toISOString(), granularity), 0);
      if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }
  }
  for (const iso of dates) {
    const key = evolutionBucketKey(iso, granularity);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, value]) => ({ key, label: bucketLabel(key, granularity), value }));
}
