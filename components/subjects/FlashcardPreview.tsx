"use client";

import { FlashcardFlipView } from "./FlashcardFlipView";

// Pré-visualização do flashcard tal como aparece na sessão de revisão — sem
// nenhuma ligação com FSRS: não gera histórico, não conta como revisão e não
// altera o agendamento. Usado pela ação "Ver" de FlashcardRow; o editor de
// flashcard usa FlashcardFlipView direto, embutido, sem esse wrapper modal.
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
  return (
    <div className="modal-overlay" style={{ zIndex: 400 }} onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>Pré-visualização</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <FlashcardFlipView front={front} back={back} imageUrl={imageUrl} imageAlt={imageAlt} backImageUrl={backImageUrl} backImageAlt={backImageAlt} />

        <p className="muted-note" style={{ textAlign: "center", marginTop: 14 }}>
          Isso é só uma prévia — não conta como revisão.
        </p>
      </div>
    </div>
  );
}
