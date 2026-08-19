"use client";

import { useId, useState } from "react";
import { RichText } from "@/components/ui/RichText";
import { COLOR_SWATCHES } from "@/lib/constants/calendar";
import type { TextHighlight } from "@/lib/utils/rich-text";

export function RichTextEditor({
  name,
  label,
  placeholder,
  rows = 3,
  required = false,
}: {
  name: string;
  label: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [highlights, setHighlights] = useState<TextHighlight[]>([]);
  const [draftPhrase, setDraftPhrase] = useState("");
  const [draftBold, setDraftBold] = useState(false);
  const [draftItalic, setDraftItalic] = useState(false);
  const [draftColor, setDraftColor] = useState<string | null>(null);

  function addHighlight() {
    const phrase = draftPhrase.trim();
    if (!phrase) return;
    setHighlights((prev) => [
      ...prev,
      { phrase, bold: draftBold || undefined, italic: draftItalic || undefined, color: draftColor || undefined },
    ]);
    setDraftPhrase("");
  }

  function removeHighlight(index: number) {
    setHighlights((prev) => prev.filter((_, i) => i !== index));
  }

  const serialized = JSON.stringify({ text, highlights });

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        required={required}
      />

      <div className="highlight-composer">
        <input
          type="text"
          value={draftPhrase}
          onChange={(e) => setDraftPhrase(e.target.value)}
          placeholder="Marcar um trecho (ex: insuficiência cardíaca)"
        />
        <button
          type="button"
          className={`format-toggle ${draftBold ? "active" : ""}`}
          onClick={() => setDraftBold((b) => !b)}
          aria-label="Negrito"
        >
          B
        </button>
        <button
          type="button"
          className={`format-toggle italic ${draftItalic ? "active" : ""}`}
          onClick={() => setDraftItalic((it) => !it)}
          aria-label="Itálico"
        >
          I
        </button>
        <div className="color-swatches">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`swatch-sm ${draftColor === c.value ? "selected" : ""}`}
              style={{ background: c.value }}
              aria-label={c.label}
              onClick={() => setDraftColor((cur) => (cur === c.value ? null : c.value))}
            />
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={addHighlight}>
          + destaque
        </button>
      </div>

      {highlights.length > 0 && (
        <div className="highlight-chips">
          {highlights.map((h, i) => (
            <span
              key={i}
              className="highlight-chip"
              style={{ fontWeight: h.bold ? 800 : undefined, fontStyle: h.italic ? "italic" : undefined, color: h.color || undefined }}
            >
              {h.phrase}
              <button type="button" onClick={() => removeHighlight(i)} aria-label="Remover destaque">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {text && (
        <div className="rich-preview">
          <RichText raw={serialized} />
        </div>
      )}

      <input type="hidden" name={name} value={serialized} readOnly />
    </div>
  );
}
