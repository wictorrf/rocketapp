import sanitizeHtml from "sanitize-html";

// Tags que o editor de flashcards realmente produz via execCommand —
// negrito, itálico, sublinhado, tachado, títulos curtos, listas,
// sobrescrito, subscrito, cor de texto e marca-texto (via style inline).
// Qualquer coisa fora disso (script, iframe, atributos de evento) é
// removida. Roda tanto ao salvar quanto ao renderizar (defesa em camadas).
//
// Usa sanitize-html em vez de isomorphic-dompurify: o isomorphic-dompurify
// depende de jsdom, que puxa um pacote ES Module (via html-encoding-sniffer
// -> @exodus/bytes) incompatível com o empacotamento de função serverless
// da Vercel — quebrava em produção com ERR_REQUIRE_ESM em toda tentativa
// de criar/editar flashcard, mesmo com jsdom marcado como
// serverExternalPackages. sanitize-html não depende de jsdom (usa
// htmlparser2, puro JS), então não tem esse risco.
const ALLOWED_TAGS = [
  "b", "strong", "i", "em", "u", "s", "strike",
  "h3", "h4",
  "ul", "ol", "li",
  "sup", "sub",
  "span", "p", "div", "br",
];

const COLOR_PATTERN = [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\)$/i];

export function sanitizeFlashcardHtml(raw: string): string {
  return sanitizeHtml(raw ?? "", {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { "*": ["style"] },
    allowedStyles: {
      "*": {
        color: COLOR_PATTERN,
        "background-color": COLOR_PATTERN,
      },
    },
  });
}

export function htmlToPlainText(raw: string): string {
  return sanitizeFlashcardHtml(raw)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
