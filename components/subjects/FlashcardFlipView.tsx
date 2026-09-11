"use client";

import { useState } from "react";
import { RichText } from "@/components/ui/RichText";

// Miolo visual do flashcard (toggle Computador/Celular + flip-card), extraído
// de FlashcardPreview pra poder ser usado tanto dentro do modal de "Ver"
// (FlashcardPreview, usado por FlashcardRow) quanto embutido ao vivo na
// coluna de pré-visualização do editor — sem duplicar a renderização.
export function FlashcardFlipView({
  front,
  back,
  imageUrl,
  imageAlt,
  backImageUrl,
  backImageAlt,
}: {
  front: string;
  back: string;
  imageUrl: string | null;
  imageAlt: string;
  backImageUrl: string | null;
  backImageAlt: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className={`fc-preview-frame ${device}`}>
      <div className="fc-preview-device-toggle">
        <button type="button" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")}>
          Computador
        </button>
        <button type="button" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")}>
          Celular
        </button>
      </div>

      <div className="fc-preview-card-area">
        <div className="flip-card" onClick={() => setRevealed((r) => !r)}>
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
    </div>
  );
}
