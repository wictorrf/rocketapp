import { sanitizeFlashcardHtml, htmlToPlainText } from "@/lib/utils/sanitize-html";

// Renderiza HTML de flashcard já formatado (negrito, listas, marca-texto,
// etc). Sempre sanitiza de novo aqui, mesmo que o conteúdo já tenha sido
// sanitizado ao salvar — defesa em camadas.
export function RichText({ raw, className }: { raw: string; className?: string }) {
  return (
    <div
      className={className ? `rich-text ${className}` : "rich-text"}
      dangerouslySetInnerHTML={{ __html: sanitizeFlashcardHtml(raw) }}
    />
  );
}

export { htmlToPlainText };
