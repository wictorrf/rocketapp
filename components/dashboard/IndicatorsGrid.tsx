import type { FlashcardMetrics, QuestionMetrics, StudyTimeMetrics, MetricsPeriod } from "@/lib/queries/metrics";
import type { Comparison } from "@/lib/metrics/calc";
import { formatStudyDuration } from "@/lib/metrics/calc";
import { ComparisonBadge } from "@/components/metrics/ComparisonBadge";

// Indicadores do período: os 6 básicos sempre aparecem; mensal soma o
// progresso do planejamento do mês, anual soma dias/meses ativos — nunca os
// dois ao mesmo tempo (ver documento de requisitos do Dashboard).
export function IndicatorsGrid({
  period,
  flashcardMetrics,
  questionMetrics,
  studyTimeMetrics,
  activityMetrics,
  monthPlanProgressPct,
  activeDaysAndMonths,
}: {
  period: MetricsPeriod;
  flashcardMetrics: FlashcardMetrics;
  questionMetrics: QuestionMetrics;
  studyTimeMetrics: StudyTimeMetrics;
  activityMetrics: { count: number; comparison: Comparison };
  monthPlanProgressPct: number | null;
  activeDaysAndMonths: { activeDays: number; activeMonths: number } | null;
}) {
  return (
    <div className="grid cols-3">
      <div className="card">
        <div className="eyebrow">Tempo líquido de estudo</div>
        <div className="stat-num">{formatStudyDuration(studyTimeMetrics.netMinutes)}</div>
        <div className="stat-label">
          <ComparisonBadge comparison={studyTimeMetrics.netMinutesComparison} />
        </div>
      </div>
      <div className="card">
        <div className="eyebrow">Questões respondidas</div>
        <div className="stat-num">{questionMetrics.respondedCount}</div>
        <div className="stat-label">
          <ComparisonBadge comparison={questionMetrics.respondedComparison} />
        </div>
      </div>
      <div className="card">
        <div className="eyebrow">Aproveitamento em questões</div>
        {questionMetrics.accuracyPct === null ? (
          <div className="stat-num" style={{ fontSize: 20 }}>
            Ainda sem dados suficientes
          </div>
        ) : (
          <>
            <div className="stat-num">{questionMetrics.accuracyPct}%</div>
            <div className="stat-label">
              <ComparisonBadge comparison={questionMetrics.accuracyComparison} />
            </div>
          </>
        )}
      </div>
      <div className="card">
        <div className="eyebrow">Flashcards revisados</div>
        <div className="stat-num">{flashcardMetrics.reviewedCount}</div>
        <div className="stat-label">
          <ComparisonBadge comparison={flashcardMetrics.reviewedComparison} />
        </div>
      </div>
      <div className="card">
        <div className="eyebrow">Retenção observada</div>
        {flashcardMetrics.retentionPct === null ? (
          <div className="stat-num" style={{ fontSize: 20 }}>
            Ainda sem dados suficientes
          </div>
        ) : (
          <>
            <div className="stat-num">{flashcardMetrics.retentionPct}%</div>
            <div className="stat-label">
              <ComparisonBadge comparison={flashcardMetrics.retentionComparison} />
            </div>
          </>
        )}
      </div>
      <div className="card">
        <div className="eyebrow">Atividades concluídas</div>
        <div className="stat-num">{activityMetrics.count}</div>
        <div className="stat-label">
          <ComparisonBadge comparison={activityMetrics.comparison} />
        </div>
      </div>

      {period === "month" && (
        <div className="card">
          <div className="eyebrow">Progresso do planejamento do mês</div>
          {monthPlanProgressPct === null ? (
            <div className="stat-num" style={{ fontSize: 20 }}>
              Mês ainda não planejado
            </div>
          ) : (
            <div className="stat-num">{monthPlanProgressPct}%</div>
          )}
        </div>
      )}

      {period === "year" && activeDaysAndMonths && (
        <>
          <div className="card">
            <div className="eyebrow">Dias ativos no ano</div>
            <div className="stat-num">{activeDaysAndMonths.activeDays}</div>
          </div>
          <div className="card">
            <div className="eyebrow">Meses ativos no ano</div>
            <div className="stat-num">
              {activeDaysAndMonths.activeMonths} <span style={{ fontSize: 16, fontWeight: 400 }}>de 12</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
