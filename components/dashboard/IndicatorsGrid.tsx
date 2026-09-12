import type { FlashcardMetrics, QuestionMetrics, StudyTimeMetrics } from "@/lib/queries/metrics";
import { formatStudyDuration } from "@/lib/metrics/calc";
import { ComparisonBadge } from "@/components/metrics/ComparisonBadge";

// Só os 4 cards principais do documento de requisitos do Dashboard — sem
// indicadores condicionais por período (esses viviam pra complementar o
// Planejamento mensal, que saiu do Dashboard).
export function IndicatorsGrid({
  flashcardMetrics,
  questionMetrics,
  studyTimeMetrics,
  onRegisterQuestions,
}: {
  flashcardMetrics: FlashcardMetrics;
  questionMetrics: QuestionMetrics;
  studyTimeMetrics: StudyTimeMetrics;
  onRegisterQuestions?: React.ReactNode;
}) {
  return (
    <div className="grid cols-2-even">
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
        {onRegisterQuestions}
      </div>
      <div className="card">
        <div className="eyebrow">Flashcards revisados</div>
        <div className="stat-num">{flashcardMetrics.reviewedCount}</div>
        <div className="stat-label">
          <ComparisonBadge comparison={flashcardMetrics.reviewedComparison} />
        </div>
      </div>
    </div>
  );
}
