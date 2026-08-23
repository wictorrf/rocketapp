import Link from "next/link";
import type { FocusSuggestion } from "@/lib/queries/metrics";

export function FocusSuggestionsList({ suggestions }: { suggestions: FocusSuggestion[] }) {
  if (suggestions.length === 0) {
    return <p className="chart-empty">Ainda não há dados suficientes para indicar onde focar.</p>;
  }

  return (
    <div className="focus-suggestions">
      {suggestions.map((s, i) => (
        <div key={s.topicId} className="focus-suggestion-card">
          <div className="wp-rank">{String(i + 1).padStart(2, "0")}</div>
          <div style={{ flex: 1 }}>
            <p className="focus-suggestion-reason">{s.reason}</p>
            <div className="focus-suggestion-actions">
              <Link href={`/subjects/${s.subjectId}/topics/${s.topicId}`}>Ver assunto</Link>
              <Link href={`/subjects/${s.subjectId}/topics/${s.topicId}`}>Revisar flashcards</Link>
              <Link href={`/subjects/${s.subjectId}/topics`}>Abrir disciplina</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
