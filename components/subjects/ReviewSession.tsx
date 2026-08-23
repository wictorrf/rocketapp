"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { RocketIcon } from "@/components/ui/RocketIcon";
import { RichText } from "@/components/ui/RichText";
import { htmlToPlainText } from "@/lib/utils/sanitize-html";
import { Rating, RATING_LABEL_PT, type Grade } from "@/lib/srs/fsrs";
import { gradeFlashcardAction, finishReviewSessionAction, getFlashcardReviewHistoryAction } from "@/lib/actions/review";
import type { ReviewCard, QueueComposition, ReviewHistoryEntry } from "@/lib/queries/review";

type ResultEntry = {
  card: ReviewCard;
  rating: Grade;
  intervalLabel: string;
};

type PersistedProgress = { totalAtStart: number; gradedCount: number; rememberedCount: number };

function progressKey(sessionId: string) {
  return `rocket-review-progress:${sessionId}`;
}

function readProgress(sessionId: string): PersistedProgress | null {
  try {
    const raw = localStorage.getItem(progressKey(sessionId));
    return raw ? (JSON.parse(raw) as PersistedProgress) : null;
  } catch {
    return null;
  }
}

function writeProgress(sessionId: string, progress: PersistedProgress) {
  try {
    localStorage.setItem(progressKey(sessionId), JSON.stringify(progress));
  } catch {
    // localStorage indisponível (modo privado etc.) — progresso persistido vira no-op
  }
}

function clearProgress(sessionId: string) {
  try {
    localStorage.removeItem(progressKey(sessionId));
  } catch {
    // no-op
  }
}

const GRADE_BUTTONS: { rating: Grade; className: string; key: string }[] = [
  { rating: Rating.Again, className: "rg-fail", key: "1" },
  { rating: Rating.Hard, className: "rg-hard", key: "2" },
  { rating: Rating.Good, className: "rg-good", key: "3" },
  { rating: Rating.Easy, className: "rg-easy", key: "4" },
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
  const [syncError, setSyncError] = useState(false);
  const [lastAttemptedRating, setLastAttemptedRating] = useState<Grade | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [history, setHistory] = useState<ReviewHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [totalAtStart, setTotalAtStart] = useState(cards.length);
  const [restoredCount, setRestoredCount] = useState(0);
  const [restoredRemembered, setRestoredRemembered] = useState(0);

  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const cardStartedAtRef = useRef<number>(0);

  const card = cards[index];

  // Recupera progresso de uma sessão que já vinha em andamento (ex: reload
  // no meio da revisão) — só existe no localStorage, então só dá pra ler no
  // cliente; não tem prop que "muda" na primeira montagem pra mover isso
  // pro corpo do render, como nos outros casos deste app.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const persisted = readProgress(sessionId);
    if (persisted) {
      setRestoredCount(persisted.gradedCount);
      setRestoredRemembered(persisted.rememberedCount);
      setTotalAtStart(persisted.totalAtStart);
    } else {
      writeProgress(sessionId, { totalAtStart: cards.length, gradedCount: 0, rememberedCount: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Novo cartão em tela: gera uma chave de idempotência nova (a anterior
  // fica presa ao cartão anterior) e reinicia a medição de tempo de
  // resposta. Precisa ser efeito, não cálculo de render — Date.now() e
  // crypto.randomUUID() são impuros, e um ref só pode ser escrito fora do
  // render.
  useEffect(() => {
    cardStartedAtRef.current = Date.now();
    setIdempotencyKey(crypto.randomUUID());
  }, [index]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleGrade(rating: Grade) {
    if (grading || !revealed) return;
    setGrading(true);
    setSyncError(false);
    setLastAttemptedRating(rating);

    let result;
    try {
      result = await gradeFlashcardAction({
        flashcardId: card.id,
        sessionId,
        rating,
        idempotencyKey,
        timezone,
        responseDurationMs: Date.now() - cardStartedAtRef.current,
      });
    } catch {
      setGrading(false);
      setSyncError(true);
      return;
    }

    if (result.error) {
      setGrading(false);
      setSyncError(true);
      return;
    }

    const nextResults = [...results, { card, rating, intervalLabel: result.intervalLabel }];
    setResults(nextResults);
    setGrading(false);
    setSyncError(false);

    const gradedCount = restoredCount + nextResults.length;
    const rememberedCount = restoredRemembered + nextResults.filter((r) => r.rating > Rating.Again).length;
    writeProgress(sessionId, { totalAtStart, gradedCount, rememberedCount });

    if (index + 1 < cards.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      await finishReviewSessionAction(sessionId, gradedCount, rememberedCount);
      clearProgress(sessionId);
      setPhase("summary");
    }
  }

  async function handleShowDetails() {
    setShowDetails(true);
    if (history !== null || historyLoading) return;
    setHistoryLoading(true);
    const entries = await getFlashcardReviewHistoryAction(card.id);
    setHistory(entries);
    setHistoryLoading(false);
  }

  useEffect(() => {
    if (phase !== "reviewing" || showDetails) return;
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
  }, [revealed, phase, grading, index, showDetails]);

  if (phase === "summary") {
    // total/remembered somam o que foi restaurado de um reload no meio da
    // sessão (só contadores, sem os cartões em si) com o que foi avaliado
    // nesta passada — os números batem com o que fica salvo em
    // review_sessions. "Pontos para revisar" só consegue listar os cartões
    // desta passada, já que o progresso restaurado não guarda o conteúdo.
    const total = restoredCount + results.length;
    const remembered = restoredRemembered + results.filter((r) => r.rating > Rating.Again).length;
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

  const gradedSoFar = restoredCount + results.length;

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
              style={{ width: `${(gradedSoFar / Math.max(totalAtStart, 1)) * 100}%` }}
            />
          </div>
          <span>
            Cartão {gradedSoFar + 1} de {totalAtStart}
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
        <button type="button" className="review-back" onClick={handleShowDetails} aria-label="Ver detalhes do cartão">
          ⓘ
        </button>
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

      {syncError && (
        <div className="review-sync-error">
          <span>⚠ Sincronização pendente — não foi possível salvar sua resposta.</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => lastAttemptedRating !== null && handleGrade(lastAttemptedRating)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!revealed ? (
        <div className="review-reveal">
          <button type="button" className="review-reveal-btn" onClick={() => setRevealed(true)}>
            Mostrar resposta
          </button>
        </div>
      ) : (
        <div className="review-grading">
          <div className="rg-label">Você lembrou desse cartão?</div>
          <div className="rg-buttons">
            {GRADE_BUTTONS.map((b) => (
              <button
                key={b.rating}
                className={`rg-btn ${b.className}`}
                disabled={grading}
                onClick={() => handleGrade(b.rating)}
              >
                {RATING_LABEL_PT[b.rating]}
                <span>revisa em {card.previews.find((p) => p.rating === b.rating)?.intervalLabel ?? "…"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showDetails && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h2>Detalhes do cartão</h2>
              <button type="button" className="icon-btn" onClick={() => setShowDetails(false)} aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="review-details-stats">
              <div className="sd-sum-item">
                <span>Estabilidade</span>
                <b>{card.stability.toFixed(1)}d</b>
              </div>
              <div className="sd-sum-item">
                <span>Dificuldade</span>
                <b>{card.difficulty.toFixed(1)}</b>
              </div>
              <div className="sd-sum-item">
                <span>Revisões</span>
                <b>{card.reps}</b>
              </div>
              <div className="sd-sum-item">
                <span>Esquecimentos</span>
                <b>{card.lapses}</b>
              </div>
            </div>

            <b style={{ display: "block", marginTop: 18, marginBottom: 8 }}>Histórico recente</b>
            {historyLoading && <p className="muted-note">Carregando…</p>}
            {!historyLoading && history?.length === 0 && <p className="muted-note">Nenhuma revisão registrada ainda.</p>}
            {!historyLoading && history && history.length > 0 && (
              <ul className="review-history-list">
                {history.map((h, i) => (
                  <li key={i}>
                    <span>{new Date(h.reviewedAt).toLocaleDateString("pt-BR")}</span>
                    <b>{RATING_LABEL_PT[h.rating]}</b>
                    <span>revisou em {h.intervalLabel}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
