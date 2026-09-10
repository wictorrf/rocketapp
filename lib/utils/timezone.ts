import { cookies } from "next/headers";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

// Fuso horário da estudante: gravado num cookie público (não sensível) pelo
// TimezoneSync no primeiro carregamento de qualquer página. Sem o cookie
// (primeiro request, JS desabilitado), cai no fuso da maior parte da base do
// Rocket em vez do fuso do servidor — evita reintroduzir o bug de "o dia
// muda antes da hora".
export async function getUserTimezone(): Promise<string> {
  const store = await cookies();
  return store.get("tz")?.value || DEFAULT_TIMEZONE;
}

// Instante UTC correspondente à meia-noite de `dateKey` (YYYY-MM-DD) NO
// FUSO `timeZone` — o inverso de toLocalDateKey. Necessário só quando o
// filtro é contra uma coluna timestamptz (ex: "revisado a partir de hoje");
// comparar chaves "YYYY-MM-DD" contra colunas `date` não precisa disso.
export function startOfDayInTimeZone(dateKey: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcGuess);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour = get("hour") % 24; // Intl pode devolver "24" em vez de "00"

  const wallClockAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  const offsetMs = wallClockAsUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offsetMs);
}
