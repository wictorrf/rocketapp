"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EDITOR_TEXT_COLORS, EDITOR_HIGHLIGHT_COLORS } from "@/lib/constants/editor-colors";
import { sanitizeFlashcardHtml } from "@/lib/utils/sanitize-html";

// Editor de texto rico via contentEditable + document.execCommand. A API é
// tecnicamente depreciada nas specs, mas continua implementada e estável em
// todos os navegadores atuais — pra um campo de frente/verso de flashcard,
// isso evita puxar uma biblioteca de editor inteira (Tiptap/Slate) só pra
// negrito/itálico/listas/cores.
export function RichTextEditor({
  name,
  label,
  placeholder,
  required = false,
  defaultValue = "",
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const id = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [isEmpty, setIsEmpty] = useState(!defaultValue.trim());
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

  function syncHidden() {
    const editor = editorRef.current;
    const hidden = hiddenRef.current;
    if (!editor || !hidden) return;
    hidden.value = editor.innerHTML;
    setIsEmpty((editor.textContent ?? "").trim().length === 0);
  }

  // Fonte da verdade no momento do envio: o evento nativo `formdata` dispara
  // bem quando o form vai virar FormData (submit real ou Server Action), e
  // sobrescreve o campo com o HTML atual do editor. Isso protege contra
  // qualquer perda de sincronia do input escondido que possa ter acontecido
  // antes (ex: reação tardia a input/blur), sem depender só desses eventos.
  useEffect(() => {
    const form = editorRef.current?.closest("form");
    if (!form) return;
    function handleFormData(e: FormDataEvent) {
      if (editorRef.current) e.formData.set(name, editorRef.current.innerHTML);
    }
    form.addEventListener("formdata", handleFormData as EventListener);
    return () => form.removeEventListener("formdata", handleFormData as EventListener);
  }, [name]);

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncHidden();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === "b") {
      e.preventDefault();
      exec("bold");
    } else if (key === "i") {
      e.preventDefault();
      exec("italic");
    } else if (key === "u") {
      e.preventDefault();
      exec("underline");
    }
    // Ctrl+Z / Ctrl+Shift+Z (desfazer/refazer) já funcionam nativamente no
    // contentEditable, sem precisar de handler.
  }

  return (
    <div className="field rte-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>

      <div className="rte-toolbar" role="toolbar" aria-label={`Formatação de ${label}`}>
        <button type="button" className="rte-btn" onClick={() => exec("bold")} aria-label="Negrito" title="Negrito (Ctrl+B)">
          <b>B</b>
        </button>
        <button type="button" className="rte-btn" onClick={() => exec("italic")} aria-label="Itálico" title="Itálico (Ctrl+I)">
          <i>I</i>
        </button>
        <button type="button" className="rte-btn" onClick={() => exec("underline")} aria-label="Sublinhado" title="Sublinhado (Ctrl+U)">
          <u>S</u>
        </button>
        <button type="button" className="rte-btn" onClick={() => exec("strikeThrough")} aria-label="Tachado" title="Tachado">
          <s>T</s>
        </button>
        <span className="rte-sep" />
        <button type="button" className="rte-btn" onClick={() => exec("formatBlock", "h3")} aria-label="Título" title="Título">
          H
        </button>
        <button type="button" className="rte-btn" onClick={() => exec("formatBlock", "p")} aria-label="Texto normal" title="Texto normal">
          ¶
        </button>
        <span className="rte-sep" />
        <button
          type="button"
          className="rte-btn"
          onClick={() => exec("insertUnorderedList")}
          aria-label="Lista com marcadores"
          title="Lista com marcadores"
        >
          •≡
        </button>
        <button
          type="button"
          className="rte-btn"
          onClick={() => exec("insertOrderedList")}
          aria-label="Lista numerada"
          title="Lista numerada"
        >
          1≡
        </button>
        <span className="rte-sep" />
        <button type="button" className="rte-btn" onClick={() => exec("superscript")} aria-label="Sobrescrito" title="Sobrescrito">
          x²
        </button>
        <button type="button" className="rte-btn" onClick={() => exec("subscript")} aria-label="Subscrito" title="Subscrito">
          x₂
        </button>
        <span className="rte-sep" />

        <div className="rte-color-wrap">
          <button
            type="button"
            className="rte-btn"
            onClick={() => {
              setTextColorOpen((o) => !o);
              setHighlightOpen(false);
            }}
            aria-label="Cor do texto"
            title="Cor do texto"
          >
            <span style={{ color: "var(--wine)", fontWeight: 800 }}>A</span>
          </button>
          {textColorOpen && (
            <div className="rte-color-panel">
              {EDITOR_TEXT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className="rte-swatch"
                  style={{ background: c.hex }}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => {
                    exec("foreColor", c.hex);
                    setTextColorOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rte-color-wrap">
          <button
            type="button"
            className="rte-btn"
            onClick={() => {
              setHighlightOpen((o) => !o);
              setTextColorOpen(false);
            }}
            aria-label="Marca-texto"
            title="Marca-texto"
          >
            🖊
          </button>
          {highlightOpen && (
            <div className="rte-color-panel">
              {EDITOR_HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className="rte-swatch"
                  style={{ background: c.hex }}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => {
                    exec("hiliteColor", c.hex);
                    setHighlightOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <span className="rte-sep" />
        <button type="button" className="rte-btn" onClick={() => exec("removeFormat")} aria-label="Limpar formatação" title="Limpar formatação">
          ⌫
        </button>
        <button type="button" className="rte-btn" onClick={() => exec("undo")} aria-label="Desfazer" title="Desfazer (Ctrl+Z)">
          ↺
        </button>
        <button type="button" className="rte-btn" onClick={() => exec("redo")} aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)">
          ↻
        </button>
      </div>

      <div
        id={id}
        ref={editorRef}
        className="rte-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        data-placeholder={placeholder}
        data-empty={isEmpty}
        dangerouslySetInnerHTML={{ __html: sanitizeFlashcardHtml(defaultValue) }}
        onInput={syncHidden}
        onBlur={syncHidden}
        onKeyDown={handleKeyDown}
      />

      <input ref={hiddenRef} type="hidden" name={name} defaultValue={sanitizeFlashcardHtml(defaultValue)} />
    </div>
  );
}
