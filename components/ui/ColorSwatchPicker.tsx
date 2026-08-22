"use client";

import { ENTITY_COLORS } from "@/lib/constants/entity-colors";

export function ColorSwatchPicker({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (hex: string) => void;
  name?: string;
}) {
  return (
    <div className="color-swatch-grid">
      {ENTITY_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`swatch ${value.toLowerCase() === c.hex.toLowerCase() ? "selected" : ""}`}
          style={{ background: c.hex }}
          aria-label={c.label}
          title={c.label}
          onClick={() => onChange(c.hex)}
        />
      ))}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
