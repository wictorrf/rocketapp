"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopicCard } from "./TopicCard";
import { reorderTopicsAction } from "@/lib/actions/topics";
import type { TopicSummary, TopicSortKey } from "@/lib/queries/topics";

// Só entra em modo arrastar-e-soltar quando sort === "manual" — nos outros
// modos a lista é computada (por nome, atividade etc.), então arrastar não
// faz sentido e os cards aparecem sem alça.
export function TopicList({
  subjectId,
  topics,
  sort,
}: {
  subjectId: string;
  topics: TopicSummary[];
  sort: TopicSortKey;
}) {
  const router = useRouter();
  const [ordered, setOrdered] = useState(topics);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Ressincroniza sempre que a lista vier diferente de fora (busca, filtro,
  // refresh depois de soltar) — ajustado durante a renderização, igual ao
  // padrão já usado em ChecklistItemRow.
  const [prevTopics, setPrevTopics] = useState(topics);
  if (topics !== prevTopics) {
    setPrevTopics(topics);
    setOrdered(topics);
  }

  if (sort !== "manual") {
    return (
      <>
        {topics.map((topic) => (
          <TopicCard key={topic.id} subjectId={subjectId} topic={topic} />
        ))}
      </>
    );
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const fromIndex = ordered.findIndex((t) => t.id === draggedId);
    const toIndex = ordered.findIndex((t) => t.id === targetId);
    setDraggedId(null);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...ordered];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrdered(next);
    reorderTopicsAction(subjectId, next.map((t) => t.id)).then(() => router.refresh());
  }

  return (
    <>
      {ordered.map((topic) => (
        <div
          key={topic.id}
          draggable
          onDragStart={() => setDraggedId(topic.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(topic.id)}
          onDragEnd={() => setDraggedId(null)}
          style={{ opacity: draggedId === topic.id ? 0.4 : 1 }}
        >
          <TopicCard
            subjectId={subjectId}
            topic={topic}
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
