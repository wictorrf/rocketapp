import type { Comparison } from "@/lib/metrics/calc";

// Termos neutros (aumentou/diminuiu/permaneceu estável) — o documento pede
// explicitamente pra não tratar todo aumento como "melhora" automaticamente.
export function ComparisonBadge({ comparison }: { comparison: Comparison }) {
  if (!comparison) {
    return <span className="cmp-badge neutral">Sem período anterior para comparação</span>;
  }
  const { deltaAbs, deltaPct, direction } = comparison;
  if (direction === "flat") return <span className="cmp-badge neutral">Permaneceu estável vs. período anterior</span>;

  const arrow = direction === "up" ? "↑" : "↓";
  const word = direction === "up" ? "Aumentou" : "Diminuiu";
  return (
    <span className={`cmp-badge ${direction}`}>
      {arrow} {word} {Math.abs(deltaPct ?? 0)}% ({deltaAbs > 0 ? "+" : ""}
      {deltaAbs}) vs. período anterior
    </span>
  );
}
