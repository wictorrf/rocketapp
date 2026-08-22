// Cores do editor de texto rico dos flashcards — listas curtas e fixas
// (diferente da paleta de 14 cores de disciplinas/assuntos/eventos).
export const EDITOR_TEXT_COLORS = [
  { label: "Preto", hex: "#101522" },
  { label: "Vinho", hex: "#68162E" },
  { label: "Rosa escuro", hex: "#B23A63" },
  { label: "Vermelho", hex: "#C94F4F" },
  { label: "Laranja", hex: "#D8952C" },
  { label: "Verde", hex: "#4D9A68" },
  { label: "Azul", hex: "#4C86C6" },
  { label: "Roxo", hex: "#8659A6" },
  { label: "Cinza", hex: "#667085" },
] as const;

export const EDITOR_HIGHLIGHT_COLORS = [
  { label: "Rosa claro", hex: "#F8E6EC" },
  { label: "Amarelo claro", hex: "#FBF0C8" },
  { label: "Verde claro", hex: "#DCEFE2" },
  { label: "Azul claro", hex: "#DCEAF7" },
  { label: "Lavanda", hex: "#EEE8FA" },
  { label: "Cinza claro", hex: "#EAECEE" },
] as const;
