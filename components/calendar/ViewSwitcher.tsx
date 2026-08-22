"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const VIEW_KEY = "rocket-calendar-view";
export type CalendarView = "month" | "week" | "agenda";
const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Mês" },
  { value: "week", label: "Semana" },
  { value: "agenda", label: "Agenda" },
];

export function ViewSwitcher({ current, hasExplicitView }: { current: CalendarView; hasExplicitView: boolean }) {
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
