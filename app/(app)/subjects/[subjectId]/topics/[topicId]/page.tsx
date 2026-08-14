import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getTopic, getTopicPanel } from "@/lib/queries/topics";
import { getQuestionLogSummary } from "@/lib/queries/questions";
import { getSignedUrls } from "@/lib/queries/storage";
import { formatHours } from "@/lib/utils/format";
import { FlashcardRow } from "@/components/subjects/FlashcardRow";
import { QuestionLogForm } from "@/components/subjects/QuestionLogForm";
import { startReviewSessionAction } from "@/lib/actions/review";

export default async function TopicDetailPage({
  params,
  searchParams,
}: PageProps<"/subjects/[subjectId]/topics/[topicId]">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { subjectId, topicId } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "questoes" ? "questoes" : "flashcards";

  const topic = await getTopic(topicId);
  if (!topic) notFound();

  const panel = await getTopicPanel(topicId);
  const imagePaths = [...panel.needsReview, ...panel.consolidated]
    .map((f) => f.imageUrl)
    .filter((p): p is string => Boolean(p));
  const signedUrls = await getSignedUrls("flashcard-images", imagePaths);

  const questionSummary = activeTab === "questoes" ? await getQuestionLogSummary(topicId) : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Link href={`/subjects/${subjectId}/topics`} className="icon-btn" aria-label="Voltar">
          ‹
        </Link>
        <h2 className="section-title" style={{ margin: 0 }}>
          {topic.name}
        </h2>
      </div>

      <div className="sd-tabs">
        <Link
          href={`/subjects/${subjectId}/topics/${topicId}?tab=flashcards`}
          className={activeTab === "flashcards" ? "active" : ""}
        >
          Flashcards
        </Link>
        <Link
          href={`/subjects/${subjectId}/topics/${topicId}?tab=questoes`}
          className={activeTab === "questoes" ? "active" : ""}
        >
          Questões e simulados
        </Link>
      </div>

      {activeTab === "flashcards" ? (
        <>
          <div className="sd-summary">
            <div className="sd-sum-item">
              <span>Flashcards</span>
              <b>{panel.totalFlashcards}</b>
            </div>
            <div className="sd-sum-item">
              <span>Revisados 1x+</span>
              <b>{panel.reviewedAtLeastOnce}</b>
            </div>
            <div className="sd-sum-item">
              <span>Novos</span>
              <b style={{ color: "var(--wine)" }}>{panel.novoCount}</b>
            </div>
            <div className="sd-sum-item">
              <span>Aprendendo</span>
              <b style={{ color: "var(--amber)" }}>{panel.aprendendoCount}</b>
            </div>
            <div className="sd-sum-item">
              <span>Consolidados</span>
              <b style={{ color: "var(--green)" }}>{panel.consolidadoCount}</b>
            </div>
            <div className="sd-sum-item">
              <span>Tempo dedicado</span>
              <b>{formatHours(panel.studiedMinutes)}</b>
            </div>
            <div className="sd-sum-item sd-next">
              <span>Próxima revisão prevista</span>
              <b>{panel.dueTodayCount > 0 ? `Hoje, ${panel.dueTodayCount} cartões` : "Nada previsto pra hoje"}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {panel.dueTodayCount > 0 && (
              <form action={startReviewSessionAction}>
                <input type="hidden" name="subjectId" value={subjectId} />
                <input type="hidden" name="topicId" value={topicId} />
                <button type="submit" className="btn btn-primary">
                  Iniciar revisão de hoje
                </button>
              </form>
            )}
            <Link
              href={`/subjects/${subjectId}/topics/${topicId}/flashcards/new`}
              className={panel.dueTodayCount > 0 ? "btn btn-ghost" : "btn btn-primary"}
            >
              Novo flashcard
            </Link>
          </div>

          <h2 className="section-title">Precisa de revisão</h2>
          <div className="fc-list" style={{ marginBottom: 28 }}>
            {panel.needsReview.length === 0 && (
              <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                Nada pendente por aqui.
              </div>
            )}
            {panel.needsReview.map((f) => (
              <FlashcardRow
                key={f.id}
                front={f.front}
                stage={f.stage}
                dueAt={f.dueAt}
                imageUrl={f.imageUrl ? (signedUrls.get(f.imageUrl) ?? null) : null}
              />
            ))}
          </div>

          <h2 className="section-title">Consolidados</h2>
          <div className="fc-list">
            {panel.consolidated.length === 0 && (
              <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                Nenhum cartão consolidado ainda — continue revisando.
              </div>
            )}
            {panel.consolidated.map((f) => (
              <FlashcardRow
                key={f.id}
                front={f.front}
                stage={f.stage}
                dueAt={f.dueAt}
                imageUrl={f.imageUrl ? (signedUrls.get(f.imageUrl) ?? null) : null}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="qz-summary">
            <div className="sd-sum-item card" style={{ flex: "unset", minWidth: 140 }}>
              <span>Questões feitas</span>
              <b>{questionSummary?.totalDone ?? 0}</b>
            </div>
            <div className="sd-sum-item card" style={{ flex: "unset", minWidth: 140 }}>
              <span>Acertos</span>
              <b>{questionSummary?.totalCorrect ?? 0}</b>
            </div>
            <div className="sd-sum-item card" style={{ flex: "unset", minWidth: 140 }}>
              <span>% de acerto</span>
              <b>{questionSummary?.accuracyPct !== null ? `${questionSummary?.accuracyPct}%` : "—"}</b>
            </div>
          </div>

          <QuestionLogForm subjectId={subjectId} topicId={topicId} />

          {questionSummary?.logs.length === 0 && (
            <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
              Nenhum registro ainda. Depois de fazer questões fora do app, registre aqui.
            </div>
          )}
          {questionSummary?.logs.map((log) => (
            <div key={log.id} className="qz-log-row">
              <div className="qz-date">
                {new Date(log.logged_at).toLocaleDateString("pt-BR")}
              </div>
              <div>
                {log.questions_done} questões{log.note ? ` · ${log.note}` : ""}
              </div>
              <div className="qz-result">
                {log.questions_correct}/{log.questions_done} (
                {Math.round((log.questions_correct / log.questions_done) * 100)}%)
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
