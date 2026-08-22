"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RocketIcon } from "@/components/ui/RocketIcon";
import { RichText } from "@/components/ui/RichText";
import { htmlToPlainText } from "@/lib/utils/sanitize-html";
import { Rating, type Grade } from "@/lib/srs/fsrs";
import { gradeFlashcardAction, finishReviewSessionAction } from "@/lib/actions/review";
import type { ReviewCard, QueueComposition } from "@/lib/queries/review";

type ResultEntry = {
  card: ReviewCard;
  rating: Grade;
  intervalLabel: string;
};

const GRADE_BUTTONS: { rating: Grade; label: string; className: string; key: string }[] = [
  { rating: Rating.Again, label: "Esqueci", className: "rg-fail", key: "1" },
  { rating: Rating.Hard, label: "Difícil", className: "rg-hard", key: "2" },
  { rating: Rating.Good, label: "Bom", className: "rg-good", key: "3" },
  { rating: Rating.Easy, label: "Fácil", className: "rg-easy", key: "4" },
];

export function ReviewSession({
  cards,
  sessionId,
  backHref,
  composition,
}: {
  cards: ReviewCard[];
  sessionId: string;
  backHref: string;
  composition?: QueueComposition;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grading, setGrading] = useState(false);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [phase, setPhase] = useState<"reviewing" | "summary">("reviewing");

  const card = cards[index];

  async function handleGrade(rating: Grade) {
    if (grading || !revealed) return;
    setGrading(true);
    const result = await gradeFlashcardAction(card.id, sessionId, rating);
    const nextResults = [...results, { card, rating, intervalLabel: result.intervalLabel }];
    setResults(nextResults);
    setGrading(false);

    if (index + 1 < cards.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      const remembered = nextResults.filter((r) => r.rating > Rating.Again).length;
      await finishReviewSessionAction(sessionId, nextResults.length, remembered);
      setPhase("summary");
    }
  }

  useEffect(() => {
    if (phase !== "reviewing") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (!revealed) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setRevealed(true);
        }
        return;
      }
      const btn = GRADE_BUTTONS.find((b) => b.key === e.key);
      if (btn) {
        e.preventDefault();
        handleGrade(btn.rating);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, phase, grading, index]);

  if (phase === "summary") {
    const total = results.length;
    const remembered = results.filter((r) => r.rating > Rating.Again).length;
    const retention = total ? Math.round((remembered / total) * 100) : 0;
    const toReview = results.filter((r) => r.rating <= Rating.Hard);

    return (
      <div className="summary-screen">
        <div className="summary-box">
          <div className="summary-icon">✦</div>
          <h2>Sessão concluída</h2>
          <p className="summary-sub">
            Isso fica separado das suas questões de simulado, para você acompanhar cada frente
            com clareza.
          </p>

          <div className="summary-stats">
            <div className="ss-item">
              <b>{total}</b>
              <span>flashcards revisados</span>
            </div>
            <div className="ss-item">
              <b style={{ color: "var(--green)" }}>{retention}%</b>
              <span>taxa de retenção</span>
            </div>
          </div>

          {toReview.length > 0 && (
            <div className="summary-review-list">
              <b>Pontos para revisar</b>
              <ul>
                {toReview.map((r) => (
                  <li key={r.card.id}>{htmlToPlainText(r.card.front)}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="summary-next">
            <div className="sn-icon">
              <RocketIcon size={14} />
            </div>
            <div>
              <b>Próxima revisão calculada automaticamente pelo FSRS</b>
              <span>cada cartão recebeu sua própria data, conforme a resposta dada</span>
            </div>
          </div>

          <Link href={backHref} className="btn btn-primary btn-block">
            Voltar
          </Link>
          <Link href="/metrics" className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>
            Ver nas métricas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="review-screen">
      <div className="review-top">
        <Link href={backHref} className="review-back">
          ‹
        </Link>
        <div className="review-progress-wrap">
          <div className="review-progress-track">
            <div
              className="review-progress-fill"
              style={{ width: `${(index / cards.length) * 100}%` }}
            />
          </div>
          <span>
            Cartão {index + 1} de {cards.length}
          </span>
          {composition && (
            <span className="review-composition">
              {composition.overdue > 0 && `${composition.overdue} atrasados`}
              {composition.overdue > 0 && (composition.dueToday > 0 || composition.newCards > 0) && ", "}
              {composition.dueToday > 0 && `${composition.dueToday} previstos para hoje`}
              {composition.dueToday > 0 && composition.newCards > 0 && ", "}
              {composition.newCards > 0 && `${composition.newCards} novos`}
            </span>
          )}
        </div>
        <div style={{ width: 38 }} />
      </div>

      <div className="review-card-area">
        <div className="flip-card" onClick={() => !revealed && setRevealed(true)}>
          <div className={`flip-inner ${revealed ? "flipped" : ""}`}>
            <div className="flip-face flip-front">
              <div className="fc-eyebrow">Frente</div>
              {card.imageUrl && (
                <img
                  src={card.imageUrl}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: 100, borderRadius: 8, marginBottom: 12 }}
                />
              )}
              {(card.topicName || card.subjectName) && (
                <div className="fc-context">
                  {card.subjectName}
                  {card.subjectName && card.topicName ? " · " : ""}
                  {card.topicName}
                </div>
              )}
              <div className="fc-question">
                <RichText raw={card.front} />
              </div>
              <div className="fc-tap-hint">Toque ou pressione Espaço para mostrar a resposta</div>
            </div>
            <div className="flip-face flip-back">
              <div className="fc-eyebrow">Verso</div>
              {card.backImageUrl && (
                <img
                  src={card.backImageUrl}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: 100, borderRadius: 8, marginBottom: 12 }}
                />
              )}
              <div className="fc-answer">
                <RichText raw={card.back} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="review-grading" style={{ visibility: revealed ? "visible" : "hidden" }}>
        <div className="rg-label">Você lembrou desse cartão?</div>
        <div className="rg-buttons">
          {GRADE_BUTTONS.map((b) => (
            <button
              key={b.rating}
              className={`rg-btn ${b.className}`}
              disabled={grading}
              onClick={() => handleGrade(b.rating)}
            >
              {b.label}
              <span>revisa em {card.previews.find((p) => p.rating === b.rating)?.intervalLabel ?? "…"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
