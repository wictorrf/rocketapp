// Paleta de 14 cores compartilhada entre Disciplinas, Assuntos e (futuramente)
// Calendário — mesma lista pedida nos dois documentos de requisitos.
export const ENTITY_COLORS = [
  { id: "wine", label: "Vinho", hex: "#68162E" },
  { id: "pink", label: "Rosa", hex: "#E1648C" },
  { id: "pink-light", label: "Rosa claro", hex: "#F2A6C1" },
  { id: "orange", label: "Laranja", hex: "#D8952C" },
  { id: "yellow", label: "Amarelo", hex: "#E3B341" },
  { id: "green", label: "Verde", hex: "#4D9A68" },
  { id: "blue", label: "Azul", hex: "#4C86C6" },
  { id: "blue-light", label: "Azul claro", hex: "#8CB6DE" },
  { id: "lavender", label: "Lavanda", hex: "#A896D1" },
  { id: "purple", label: "Roxo", hex: "#8659A6" },
  { id: "coral", label: "Coral", hex: "#E17B5D" },
  { id: "brown", label: "Marrom", hex: "#8C6449" },
  { id: "gray", label: "Cinza", hex: "#98A2B3" },
  { id: "neutral", label: "Neutro", hex: "#667085" },
] as const;

export const DEFAULT_ENTITY_COLOR = ENTITY_COLORS[0].hex;

export function getEntityColorLabel(hex: string | null): string {
  return ENTITY_COLORS.find((c) => c.hex.toLowerCase() === hex?.toLowerCase())?.label ?? "Neutro";
}

// Escolhe preto ou branco pro texto por cima da cor, pelo brilho relativo.
export function getContrastText(hex: string): "#101522" | "#ffffff" {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#101522" : "#ffffff";
}
