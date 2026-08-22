// Lista curada de pilares de vida pro ritual de planejamento mensal —
// a usuária escolhe até 5 pra priorizar naquele mês.
export const PILLAR_OPTIONS: { key: string; label: string; emoji: string }[] = [
  { key: "espiritual", label: "Espiritual", emoji: "🙏" },
  { key: "faculdade", label: "Faculdade / Estudos", emoji: "🎓" },
  { key: "carreira", label: "Negócio / Carreira", emoji: "💼" },
  { key: "relacionamento", label: "Casamento / Relacionamento", emoji: "💞" },
  { key: "pessoal", label: "Desenvolvimento pessoal", emoji: "🌱" },
  { key: "financeiro", label: "Financeiro", emoji: "💰" },
  { key: "saude", label: "Saúde / Bem-estar", emoji: "🧘" },
  { key: "familia", label: "Família", emoji: "👨‍👩‍👧" },
  { key: "social", label: "Social / Amizades", emoji: "🤝" },
  { key: "lazer", label: "Lazer", emoji: "🎨" },
  { key: "outro", label: "Outro", emoji: "✨" },
];

export const PILLAR_LABEL: Record<string, string> = Object.fromEntries(
  PILLAR_OPTIONS.map((p) => [p.key, p.label]),
);
export const PILLAR_EMOJI: Record<string, string> = Object.fromEntries(
  PILLAR_OPTIONS.map((p) => [p.key, p.emoji]),
);

export const MAX_PILLARS = 5;
