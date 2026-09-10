"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const VIEW_KEY = "rocket-calendar-view";
export type CalendarView = "month" | "week";
const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Mês" },
  { value: "week", label: "Semana" },
];

// Segunda-feira da semana que contém dateKey — mesma lógica usada em
// app/(app)/calendar/page.tsx, duplicada aqui por ser puro e este ser um
// componente client-side.
function mondayOf(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ViewSwitcher({
  current,
  hasExplicitView,
  referenceDateKey,
}: {
  current: CalendarView;
  hasExplicitView: boolean;
  referenceDateKey: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (hasExplicitView) return;
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved && saved !== current && VIEWS.some((v) => v.value === saved)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", saved);
      router.replace(`/calendar?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(view: CalendarView) {
    localStorage.setItem(VIEW_KEY, view);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    params.delete("day");
    // Leva a data que estava sendo vista pra view seguinte — sem isso, a
    // Semana sempre abria na semana de hoje (e o Mês sempre no mês atual),
    // não importa o que estivesse selecionado antes, dando a impressão de
    // que os eventos "sumiam" ao trocar de visualização.
    if (view === "week") {
      params.set("weekStart", mondayOf(referenceDateKey));
    } else if (view === "month") {
      const d = new Date(`${referenceDateKey}T00:00:00`);
      params.set("year", String(d.getFullYear()));
      params.set("month", String(d.getMonth() + 1));
    }
    router.push(`/calendar?${params.toString()}`);
  }

  return (
    <div className="view-switcher">
      {VIEWS.map((v) => (
        <button
          key={v.value}
          type="button"
          className={current === v.value ? "vs-btn active" : "vs-btn"}
          onClick={() => select(v.value)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
