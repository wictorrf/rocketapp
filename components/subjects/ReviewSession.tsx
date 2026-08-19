"use client";

import { useState } from "react";
import Link from "next/link";
import { RocketIcon } from "@/components/ui/RocketIcon";
import { RichText, richTextToPlain } from "@/components/ui/RichText";
import { STAGE_LABEL_PT } from "@/lib/srs/sm2";
import { gradeFlashcardAction, finishReviewSessionAction } from "@/lib/actions/review";
import type { ReviewCard } from "@/lib/queries/review";

type Grade = 0 | 1 | 2;

type ResultEntry = {
  card: ReviewCard;
  grade: Grade;
  intervalDays: number;
};

export function ReviewSession({
  cards,
  sessionId,
  backHref,
}: {
  cards: ReviewCard[];
  sessionId: string;
  backHref: string;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grading, setGrading] = useState(false);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [phase, setPhase] = useState<"reviewing" | "summary">("reviewing");

  const card = cards[index];

  async function handleGrade(grade: Grade) {
    if (grading) return;
    setGrading(true);
    const result = await gradeFlashcardAction(card.id, sessionId, grade);
    const nextResults = [...results, { card, grade, intervalDays: result.intervalDays }];
    setResults(nextResults);
    setGrading(false);

    if (index + 1 < cards.length) {
      setIndex(index + 1);
      setFlipped(false);
    } else {
      const remembered = nextResults.filter((r) => r.grade > 0).length;
      await finishReviewSessionAction(sessionId, nextResults.length, remembered);
      setPhase("summary");
    }
  }

  if (phase === "summary") {
    const total = results.length;
    const remembered = results.filter((r) => r.grade > 0).length;
    const retention = total ? Math.round((remembered / total) * 100) : 0;
    const toReview = results.filter((r) => r.grade < 2);
    const soon = results.filter((r) => r.intervalDays <= 3).length;
    const later = total - soon;

    let nextInfo = "";
    if (soon > 0) nextInfo += `${soon} ${soon > 1 ? "cartões" : "cartão"} em poucos dias`;
    if (soon > 0 && later > 0) nextInfo += ", ";
    if (later > 0) nextInfo += `${later} ${later > 1 ? "cartões" : "cartão"} mais adiante`;
    if (!nextInfo) nextInfo = "tudo revisado por agora";

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
                  <li key={r.card.id}>{richTextToPlain(r.card.front)}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="summary-next">
            <div className="sn-icon">
              <RocketIcon size={14} />
            </div>
            <div>
              <b>Próxima revisão calculada automaticamente</b>
              <span>{nextInfo}</span>
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
        </div>
        <div style={{ width: 38 }} />
      </div>

      <div className="review-card-area">
        <div className="flip-card" onClick={() => setFlipped((f) => !f)}>
          <div className={`flip-inner ${flipped ? "flipped" : ""}`}>
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
              <div className="fc-tap-hint">Toque para virar</div>
            </div>
            <div className="flip-face flip-back">
              <div className="fc-eyebrow">Verso</div>
              <div className="fc-answer">
                <RichText raw={card.back} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="review-grading" style={{ visibility: flipped ? "visible" : "hidden" }}>
        <div className="rg-label">Você lembrou desse cartão?</div>
        <div className="rg-buttons">
          <button className="rg-btn rg-fail" disabled={grading} onClick={() => handleGrade(0)}>
            Não lembrei
            <span>revisa amanhã</span>
          </button>
          <button className="rg-btn rg-hard" disabled={grading} onClick={() => handleGrade(1)}>
            Com esforço
            <span>revisa em poucos dias</span>
          </button>
          <button className="rg-btn rg-easy" disabled={grading} onClick={() => handleGrade(2)}>
            Lembrei fácil
            <span>revisa em mais tempo · {STAGE_LABEL_PT.consolidado.toLowerCase()} em breve</span>
          </button>
        </div>
      </div>
    </div>
  );
}
