"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PERIOD_LABEL, FIRST_YEAR, type MetricsPeriod } from "@/lib/metrics/calc";

const DEFAULT_PERIODS: MetricsPeriod[] = ["week", "month", "year", "all"];

function withParams(basePath: string, searchParams: URLSearchParams, overrides: Record<string, string | null>): string {
  const params = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  return `${basePath}?${params.toString()}`;
}

export function PeriodSelector({
  period,
  hasExplicitPeriod,
  year,
  month,
  weekDateKey,
  rangeLabel,
  basePath = "/metrics",
  periods = DEFAULT_PERIODS,
  showTodayShortcut = true,
  inline = false,
}: {
  period: MetricsPeriod;
  hasExplicitPeriod: boolean;
  year: number;
  month: number;
  weekDateKey: string;
  rangeLabel: string;
  basePath?: string;
  periods?: MetricsPeriod[];
  // O Dashboard já centra tudo em "hoje" e removeu esse atalho do
  // documento de requisitos — /metrics continua com ele por padrão.
  showTodayShortcut?: boolean;
  // Funde as abas de período e a navegação de datas numa única linha
  // (documento de requisitos do Dashboard) — /metrics mantém duas linhas.
  inline?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storageKey = `rocket-period-${basePath.replace(/\//g, "") || "metrics"}`;

  useEffect(() => {
    if (hasExplicitPeriod) return;
    const saved = localStorage.getItem(storageKey);
    if (saved && saved !== period && periods.includes(saved as MetricsPeriod)) {
      router.replace(withParams(basePath, searchParams, { period: saved, date: null, year: null, month: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectPeriod(next: MetricsPeriod) {
    localStorage.setItem(storageKey, next);
    router.push(withParams(basePath, searchParams, { period: next, date: null, year: null, month: null }));
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  function nav(direction: -1 | 1) {
    if (period === "week") {
      const d = new Date(`${weekDateKey}T00:00:00`);
      d.setDate(d.getDate() + direction * 7);
      return withParams(basePath, searchParams, { date: d.toISOString().slice(0, 10) });
    }
    if (period === "month") {
      let m = month + direction;
      let y = year;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      return withParams(basePath, searchParams, { year: String(y), month: String(m) });
    }
    if (period === "year") {
      const y = year + direction;
      return withParams(basePath, searchParams, { year: String(Math.max(FIRST_YEAR, y)) });
    }
    return basePath;
  }

  const yearOptions = Array.from({ length: Math.max(1, currentYear - FIRST_YEAR + 1) }, (_, i) => FIRST_YEAR + i);

  return (
    <div className={inline ? "metrics-period inline" : "metrics-period"}>
      <div className="metric-tabs">
        {periods.map((p) => (
          <button key={p} type="button" className={period === p ? "active" : ""} onClick={() => selectPeriod(p)}>
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {period !== "all" && (
        <div className="metrics-period-nav">
          <button
            type="button"
            className="mp-nav-btn"
            disabled={period === "year" && year <= FIRST_YEAR}
            onClick={() => router.push(nav(-1))}
            aria-label="Período anterior"
          >
            ‹
          </button>
          <span className="mp-range-label">{rangeLabel}</span>
          <button type="button" className="mp-nav-btn" onClick={() => router.push(nav(1))} aria-label="Próximo período">
            ›
          </button>
          {period === "year" ? (
            <select
              aria-label="Selecionar ano"
              value={year}
              onChange={(e) => router.push(withParams(basePath, searchParams, { year: e.target.value }))}
              className="mp-year-select"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          ) : (
            showTodayShortcut && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  router.push(
                    period === "week"
                      ? withParams(basePath, searchParams, { date: todayKey })
                      : withParams(basePath, searchParams, { year: String(currentYear), month: String(currentMonth) }),
                  )
                }
              >
                Hoje
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
