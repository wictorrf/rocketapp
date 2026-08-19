import { PILLAR_LABEL, PILLAR_EMOJI } from "@/lib/constants/pillars";
import type { MonthlyPlan } from "@/lib/queries/calendar";
import { MonthlyReviewForm } from "./MonthlyReviewForm";

export function MonthlyPlanViewer({ plan, month, monthLabel }: { plan: MonthlyPlan; month: string; monthLabel: string }) {
  const { goals } = plan;

  return (
    <div className="plan-viewer">
      <div className="plan-mission">“{goals.mission}”</div>

      {goals.pillars.map((pillar) => {
        const mainGoal = goals.mainGoals.find((g) => g.pillarKey === pillar.key);
        return (
          <div key={pillar.key} className="plan-pillar">
            <b className="plan-pillar-title">
              {PILLAR_EMOJI[pillar.key] ?? "🎯"} {PILLAR_LABEL[pillar.key] ?? pillar.key}
            </b>
            {mainGoal?.text && <div className="plan-goal">Meta: {mainGoal.text}</div>}
            {pillar.purpose && <div className="plan-purpose">Propósito: {pillar.purpose}</div>}
            {pillar.objectives.length > 0 && (
              <ul>
                {pillar.objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {goals.review ? (
        <div className="plan-review-box">
          <b>Revisão do mês</b>
          {goals.review}
        </div>
      ) : (
        <MonthlyReviewForm month={month} monthLabel={monthLabel} />
      )}
    </div>
  );
}
