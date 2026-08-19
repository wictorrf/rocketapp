import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getDueSummaryByTopic } from "@/lib/queries/review";
import { startReviewSessionAction, startMixedReviewSessionAction } from "@/lib/actions/review";

export default async function FlashcardsHubPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const dueByTopic = await getDueSummaryByTopic(profile.userId);
  const totalDue = dueByTopic.reduce((sum, t) => sum + t.dueCount, 0);

  return (
    <div>
      <h2 className="section-title">Revisar hoje</h2>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="eyebrow">Cartões vencidos agora</div>
        <div className="stat-num">{totalDue}</div>
        <div className="stat-label" style={{ marginBottom: 16 }}>
          {totalDue > 0 ? "em todas as suas disciplinas" : "nada previsto por agora"}
        </div>
        {totalDue > 0 && (
          <form action={startMixedReviewSessionAction}>
            <button type="submit" className="btn btn-primary">
              Revisar tudo misturado
            </button>
          </form>
        )}
      </div>

      <h2 className="section-title">Ou revise cada tema separado</h2>
      {dueByTopic.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          Nenhum cartão previsto pra hoje. Crie novos flashcards ou volte mais tarde.
        </div>
      ) : (
        <div className="fc-list">
          {dueByTopic.map((t) => (
            <form key={t.topicId} action={startReviewSessionAction} className="fc-row">
              <input type="hidden" name="subjectId" value={t.subjectId} />
              <input type="hidden" name="topicId" value={t.topicId} />
              <div className="fc-thumb">📖</div>
              <div className="fc-row-body">
                <b>{t.topicName}</b>
                <span>{t.subjectName}</span>
              </div>
              <div className="fc-stage aprendendo">
                {t.dueCount} {t.dueCount > 1 ? "cartões" : "cartão"}
              </div>
              <button type="submit" className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }}>
                Revisar
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
