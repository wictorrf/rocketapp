import { parseRichText, splitRichText } from "@/lib/utils/rich-text";

export function RichText({ raw }: { raw: string }) {
  const { text, highlights } = parseRichText(raw);
  const segments = splitRichText(text, highlights);

  return (
    <>
      {segments.map((seg, i) => (
        <span
          key={i}
          style={{
            fontWeight: seg.bold ? 800 : undefined,
            fontStyle: seg.italic ? "italic" : undefined,
            color: seg.color || undefined,
          }}
        >
          {seg.text}
        </span>
      ))}
    </>
  );
}

// Versão em texto puro (sem marcação), usada em contextos que não podem
// renderizar JSX — ex: metadados, previews curtos.
export function richTextToPlain(raw: string): string {
  return parseRichText(raw).text;
}
