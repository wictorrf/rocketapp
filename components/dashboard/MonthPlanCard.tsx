import Link from "next/link";
import type { MonthPlanSummary } from "@/lib/queries/home";

export function MonthPlanCard({
  summary,
  year,
  month,
  monthLabel,
}: {
  summary: MonthPlanSummary;
  year: number;
  month: number;
  monthLabel: string;
}) {
  return (
    <div className="card">
      <h2 className="section-title">Planejamento do mês</h2>
      {summary.hasPlan ? (
        <>
          <p className="month-plan-mission">“{summary.mission}”</p>
          {summary.progressPct !== null && (
            <>
              <div className="checklist-progress-label" style={{ marginBottom: 6 }}>
                {summary.actionsDone} de {summary.actionsTotal} ações concluídas ({summary.progressPct}%)
              </div>
              <div className="checklist-progress-bar" style={{ marginBottom: 16 }}>
                <div style={{ width: `${summary.progressPct}%` }} />
              </div>
            </>
          )}
          <Link href={`/calendar?year=${year}&month=${month}`} className="btn btn-ghost btn-sm">
            Ver no Calendário
          </Link>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
            {monthLabel} ainda não foi planejado. Reserve 5 minutos para definir metas e deixar sua rotina no
            automático.
          </p>
          <Link href={`/calendar?year=${year}&month=${month}&plan=1`} className="btn btn-primary btn-sm">
            Planejar {monthLabel}
          </Link>
        </>
      )}
    </div>
  );
}
