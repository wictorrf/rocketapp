import Link from "next/link";
import { startReviewSessionAction } from "@/lib/actions/review";
import type { TopicHubSummary } from "@/lib/queries/review";

const STATUS_LABEL: Record<string, string> = {
  atrasado: "Atrasado",
  revisar_hoje: "Revisar hoje",
  novo: "Novos",
  aprendendo: "Em aprendizagem",
  revisao: "Em revisão",
  reaprendizagem: "Em reaprendizagem",
  suspenso: "Suspensos",
  precisa_reforco: "Precisa de reforço",
  em_dia: "Em dia",
};

export function FlashcardsHubTopicCard({ summary }: { summary: TopicHubSummary }) {
  const pendingCount = summary.overdueCount + summary.dueTodayCount + summary.newCount;
  const href = `/subjects/${summary.subjectId}/topics/${summary.topicId}`;

  return (
    <div className="fc-hub-card">
      <Link href={href} className="fc-hub-card-link">
        <div className="fc-hub-card-top">
          <b>{summary.topicName}</b>
          <span>{summary.subjectName}</span>
        </div>

        {pendingCount > 0 ? (
          <div className="fc-hub-card-counts">
            {summary.overdueCount > 0 && (
              <span className="fc-hub-count overdue">{summary.overdueCount} atrasados</span>
            )}
            {summary.dueTodayCount > 0 && <span className="fc-hub-count">{summary.dueTodayCount} hoje</span>}
            {summary.newCount > 0 && <span className="fc-hub-count new">{summary.newCount} novos</span>}
            <span className="fc-hub-count muted">~{summary.estimatedMinutes} min</span>
          </div>
        ) : (
          <div className="fc-hub-card-counts">
            <span className="fc-hub-count em-dia">{STATUS_LABEL.em_dia}</span>
          </div>
        )}

        {summary.needsReinforcementCount > 0 && (
          <div className="fc-hub-card-reinforce">
            {summary.needsReinforcementCount} {summary.needsReinforcementCount === 1 ? "cartão precisa" : "cartões precisam"} de reforço
          </div>
        )}
      </Link>

      {pendingCount > 0 && (
        <form action={startReviewSessionAction}>
          <input type="hidden" name="subjectId" value={summary.subjectId} />
          <input type="hidden" name="topicId" value={summary.topicId} />
          <button type="submit" className="btn btn-primary btn-sm">
            Revisar
          </button>
        </form>
      )}
    </div>
  );
}
