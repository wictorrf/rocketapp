"use client";

import { useEffect, useRef, useState } from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";

export function EmojiPickerButton({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (emoji: string) => void;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="emoji-picker-wrap" ref={wrapRef}>
      <button type="button" className="emoji-picker-trigger" onClick={() => setOpen((o) => !o)}>
        {value ? (
          <span className="emoji-picker-current">{value}</span>
        ) : (
          <span className="emoji-picker-placeholder">Sem emoji</span>
        )}
        <span>Escolher emoji</span>
      </button>
      {value && (
        <button
          type="button"
          className="emoji-picker-clear"
          onClick={() => onChange("")}
          aria-label="Remover emoji"
        >
          ✕
        </button>
      )}
      {name && <input type="hidden" name={name} value={value} />}
      {open && (
        <div className="emoji-picker-popover">
          <EmojiPicker
            onEmojiClick={(data: EmojiClickData) => {
              onChange(data.emoji);
              setOpen(false);
            }}
            searchDisabled={false}
            skinTonesDisabled
            autoFocusSearch={false}
            width={320}
            height={360}
          />
        </div>
      )}
    </div>
  );
}
