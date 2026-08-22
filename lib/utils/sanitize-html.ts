import DOMPurify from "isomorphic-dompurify";

// Tags que o editor de flashcards realmente produz via execCommand —
// negrito, itálico, sublinhado, tachado, títulos curtos, listas,
// sobrescrito, subscrito, cor de texto e marca-texto (via style inline).
// Qualquer coisa fora disso (script, iframe, atributos de evento) é
// removida. Roda tanto ao salvar quanto ao renderizar (defesa em camadas).
const ALLOWED_TAGS = [
  "b", "strong", "i", "em", "u", "s", "strike",
  "h3", "h4",
  "ul", "ol", "li",
  "sup", "sub",
  "span", "p", "div", "br",
];

export function sanitizeFlashcardHtml(raw: string): string {
  return DOMPurify.sanitize(raw ?? "", { ALLOWED_TAGS, ALLOWED_ATTR: ["style"] });
}

export function htmlToPlainText(raw: string): string {
  return sanitizeFlashcardHtml(raw)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
