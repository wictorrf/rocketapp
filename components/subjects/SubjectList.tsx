"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SubjectCard } from "./SubjectCard";
import { reorderSubjectsAction } from "@/lib/actions/subjects";
import type { SubjectSummary, SubjectSortKey } from "@/lib/queries/subjects";

// Espelha TopicList.tsx: arrastar-e-soltar fica disponível em qualquer
// ordenação, não só na manual — ao soltar uma disciplina em outra posição, a
// nova ordem é salva e o filtro muda sozinho para "Ordem manual".
export function SubjectList({
  subjects,
  sort,
}: {
  subjects: SubjectSummary[];
  sort: SubjectSortKey;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ordered, setOrdered] = useState(subjects);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [prevSubjects, setPrevSubjects] = useState(subjects);
  if (subjects !== prevSubjects) {
    setPrevSubjects(subjects);
    setOrdered(subjects);
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const fromIndex = ordered.findIndex((s) => s.id === draggedId);
    const toIndex = ordered.findIndex((s) => s.id === targetId);
    setDraggedId(null);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...ordered];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrdered(next);

    reorderSubjectsAction(next.map((s) => s.id)).then(() => {
      if (sort === "manual") {
        router.refresh();
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", "manual");
      router.push(`/subjects?${params.toString()}`);
    });
  }

  return (
    <>
      {ordered.map((subject) => (
        <div
          key={subject.id}
          draggable
          onDragStart={() => setDraggedId(subject.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(subject.id)}
          onDragEnd={() => setDraggedId(null)}
          style={{ opacity: draggedId === subject.id ? 0.4 : 1 }}
        >
          <SubjectCard
            subject={subject}
            dragHandle={
              <span className="drag-handle" aria-hidden>
                ⋮⋮
              </span>
            }
          />
        </div>
      ))}
    </>
  );
}
