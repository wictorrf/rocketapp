// Formatação "simples" dos flashcards: o texto é digitado normalmente, e a
// usuária marca trechos/frases específicas pra ficarem em negrito, itálico
// ou com uma cor — aplicado onde quer que aquele trecho apareça no texto.
// Guardado como JSON dentro da própria coluna front/back (sem migração).
// Cartões antigos em texto puro continuam funcionando: se o parse falhar,
// tratamos a string toda como texto sem destaque nenhum.

export type TextHighlight = {
  phrase: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
};

export type RichText = {
  text: string;
  highlights: TextHighlight[];
};

export function parseRichText(raw: string): RichText {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.text === "string" && Array.isArray(parsed.highlights)) {
      return { text: parsed.text, highlights: parsed.highlights };
    }
  } catch {
    // não era JSON — cartão antigo em texto puro
  }
  return { text: raw, highlights: [] };
}

export function serializeRichText(rt: RichText): string {
  return JSON.stringify(rt);
}

export type RichTextSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
};

// Varre o texto da esquerda pra direita; em cada posição, usa o destaque
// mais longo que bater ali (evita que um destaque menor "quebre" um maior
// que o contém). Comparação sensível a maiúsculas/minúsculas, de propósito
// — mantém previsível pra usuária que escolheu o trecho exato.
export function splitRichText(text: string, highlights: TextHighlight[]): RichTextSegment[] {
  const validHighlights = highlights.filter((h) => h.phrase && h.phrase.length > 0);
  if (validHighlights.length === 0 || !text) return [{ text }];

  const sorted = [...validHighlights].sort((a, b) => b.phrase.length - a.phrase.length);
  const segments: RichTextSegment[] = [];
  let i = 0;
  let buffer = "";

  const flushBuffer = () => {
    if (buffer) {
      segments.push({ text: buffer });
      buffer = "";
    }
  };

  while (i < text.length) {
    const match = sorted.find((h) => text.startsWith(h.phrase, i));
    if (match) {
      flushBuffer();
      segments.push({
        text: match.phrase,
        bold: match.bold,
        italic: match.italic,
        color: match.color,
      });
      i += match.phrase.length;
    } else {
      buffer += text[i];
      i += 1;
    }
  }
  flushBuffer();
  return segments;
}
