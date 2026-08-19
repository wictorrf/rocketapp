"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleTaskStatusAction } from "@/lib/actions/calendar";
import type { TodayTask } from "@/lib/queries/home";

export function TodayTaskRow({ task }: { task: TodayTask }) {
  const [done, setDone] = useState(task.done);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !done;
    setDone(next);
    startTransition(() => {
      toggleTaskStatusAction(task.id, next);
    });
  }

  return (
    <div className="task-row" style={{ opacity: isPending ? 0.7 : 1 }}>
      {task.checkable ? (
        <button
          type="button"
          className={`task-check ${task.type} ${done ? "done" : ""}`}
          onClick={handleToggle}
          aria-label={done ? "Marcar como pendente" : "Marcar como concluída"}
        >
          {done ? "✓" : ""}
        </button>
      ) : (
        <div className={`task-dot ${task.type}`} />
      )}
      <Link
        href={task.href}
        className="t-info"
        style={{ textDecoration: "none", ...(done ? { opacity: 0.55 } : {}) }}
      >
        <b style={done ? { textDecoration: "line-through" } : undefined}>{task.title}</b>
        <span>{task.subtitle}</span>
      </Link>
      {task.time && <div className="t-time">{task.time.slice(0, 5)}</div>}
    </div>
  );
}
