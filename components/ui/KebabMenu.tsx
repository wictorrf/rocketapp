"use client";

import { useEffect, useRef, useState } from "react";

export type KebabAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

export function KebabMenu({ actions, ariaLabel = "Mais opções" }: { actions: KebabAction[]; ariaLabel?: string }) {
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
    <div
      className="kebab-menu"
      ref={wrapRef}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button type="button" className="kebab-trigger" aria-label={ariaLabel} onClick={() => setOpen((o) => !o)}>
        ⋮
      </button>
      {open && (
        <div className="kebab-dropdown">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={a.danger ? "kebab-item danger" : "kebab-item"}
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
