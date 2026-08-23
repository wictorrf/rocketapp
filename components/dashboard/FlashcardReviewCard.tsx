import Link from "next/link";
import type { FlashcardReviewHighlight } from "@/lib/queries/home";

export function FlashcardReviewCard({ highlight }: { highlight: FlashcardReviewHighlight }) {
  const { overdueCount, dueTodayCount, newCount, totalCount, estimatedMinutes, priority } = highlight;

  return (
    <div className="card">
      <h2 className="section-title">Revisão de flashcards em destaque</h2>
      {totalCount === 0 ? (
        <p className="muted-note">Nenhuma revisão pendente agora. Bom trabalho! 🎉</p>
      ) : (
        <>
          <div className="review-highlight-counts">
            <div>
              <b>{overdueCount}</b>
              <span>atrasados</span>
            </div>
            <div>
              <b>{dueTodayCount}</b>
              <span>hoje</span>
            </div>
            <div>
              <b>{newCount}</b>
              <span>novos</span>
            </div>
          </div>
          {priority && (
            <p className="review-highlight-priority">
              Assunto prioritário: <b>{priority.topicName}</b> ({priority.subjectName})
            </p>
          )}
          <p className="muted-note" style={{ margin: "6px 0 14px" }}>
            ~{estimatedMinutes} min estimados para {totalCount} {totalCount === 1 ? "cartão" : "cartões"}
          </p>
          <Link href="/flashcards" className="btn btn-primary btn-sm">
            Começar agora
          </Link>
        </>
      )}
    </div>
  );
}
