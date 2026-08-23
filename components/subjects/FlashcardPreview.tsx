"use client";

import { useState } from "react";
import { RichText } from "@/components/ui/RichText";

// Pré-visualização do flashcard tal como aparece na sessão de revisão —
// mesma estrutura visual de flip-card do ReviewSession, mas sem nenhuma
// ligação com FSRS: não gera histórico, não conta como revisão e não altera
// o agendamento. É só a renderização local do que está no formulário agora.
export function FlashcardPreview({
  front,
  back,
  imageUrl,
  imageAlt,
  backImageUrl,
  backImageAlt,
  onClose,
}: {
  front: string;
  back: string;
  imageUrl: string | null;
  imageAlt: string;
  backImageUrl: string | null;
  backImageAlt: string;
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="modal-overlay" style={{ zIndex: 400 }} onClick={onClose}>
      <div className={`modal-box fc-preview-frame ${device}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>Pré-visualização</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="fc-preview-device-toggle">
          <button type="button" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")}>
            Computador
          </button>
          <button type="button" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")}>
            Celular
          </button>
        </div>

        <div className="fc-preview-card-area">
          <div className="flip-card" onClick={() => !revealed && setRevealed(true)}>
            <div className={`flip-inner ${revealed ? "flipped" : ""}`}>
              <div className="flip-face flip-front">
                <div className="fc-eyebrow">Frente</div>
                {imageUrl && <img src={imageUrl} alt={imageAlt} style={{ maxWidth: "100%", maxHeight: 100, borderRadius: 8, marginBottom: 12 }} />}
                <div className="fc-question">
                  <RichText raw={front} />
                </div>
                <div className="fc-tap-hint">Toque ou pressione Espaço para mostrar a resposta</div>
              </div>
              <div className="flip-face flip-back">
                <div className="fc-eyebrow">Verso</div>
                {backImageUrl && <img src={backImageUrl} alt={backImageAlt} style={{ maxWidth: "100%", maxHeight: 100, borderRadius: 8, marginBottom: 12 }} />}
                <div className="fc-answer">
                  <RichText raw={back} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="muted-note" style={{ textAlign: "center", marginTop: 14 }}>
          Isso é só uma prévia — não conta como revisão.
        </p>
      </div>
    </div>
  );
}
