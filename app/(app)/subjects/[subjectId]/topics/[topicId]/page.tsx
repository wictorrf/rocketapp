import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getTopic, getTopicPanel } from "@/lib/queries/topics";
import { getQuestionLogSummary } from "@/lib/queries/questions";
import { getSignedUrls } from "@/lib/queries/storage";
import { formatHours } from "@/lib/utils/format";
import { FlashcardSection } from "@/components/subjects/FlashcardSection";
import { NewQuestionLogButton } from "@/components/subjects/NewQuestionLogButton";
import { QuestionLogList } from "@/components/subjects/QuestionLogList";
import { RetentionCurve } from "@/components/subjects/RetentionCurve";
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
  // Só assina de uma vez as imagens das seções abertas por padrão
  // (Precisa de revisão + Consolidados). "Todos os flashcards" começa
  // fechado e assina sob demanda ao ser aberto pela primeira vez — evita
  // gastar assinatura de Storage com imagens que a pessoa nunca chega a ver.
  const eagerImagePaths = [...panel.needsReview, ...panel.consolidated]
    .flatMap((f) => [f.imageUrl, f.backImageUrl])
    .filter((p): p is string => Boolean(p));
  const signedUrls = await getSignedUrls("flashcard-images", eagerImagePaths);
  const withSignedUrl = (f: (typeof panel.all)[number]) => ({
    ...f,
    imageUrl: f.imageUrl ? (signedUrls.get(f.imageUrl) ?? null) : null,
    backImageUrl: f.backImageUrl ? (signedUrls.get(f.backImageUrl) ?? null) : null,
  });

  // Buscado sempre (não só na aba Questões) — Questões respondidas e
  // Aproveitamento em questões agora também aparecem na faixa principal da
  // aba Flashcards.
  const questionSummary = await getQuestionLogSummary(topicId);

  return (
    <div className="subjects-page">
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
          Questões registradas
        </Link>
      </div>

      {activeTab === "flashcards" ? (
        <>
          <div className="sd-summary">
            <div className="sd-sum-item">
              <span>Flashcards ativos</span>
              <b>{panel.totalFlashcards}</b>
            </div>
            <div className="sd-sum-item sd-next">
              <span>Atrasados / Revisar hoje</span>
              <b>
                {panel.atrasadosCount + panel.dueTodayCount > 0
                  ? `Hoje, ${panel.atrasadosCount + panel.dueTodayCount} cartões`
                  : "Você está em dia com suas revisões"}
              </b>
            </div>
            <div className="sd-sum-item">
              <span>Retenção observada</span>
              {panel.retentionPct === null ? (
                <b style={{ fontSize: 14, fontFamily: "var(--font-body)" }}>Ainda sem dados suficientes</b>
              ) : (
                <b>{panel.retentionPct}%</b>
              )}
            </div>
            <div className="sd-sum-item">
              <span>Questões respondidas</span>
              <b>{questionSummary.totalDone}</b>
            </div>
            <div className="sd-sum-item">
              <span>Aproveitamento em questões</span>
              <b>{questionSummary.accuracyPct !== null ? `${questionSummary.accuracyPct}%` : "—"}</b>
            </div>
            <div className="sd-sum-item">
              <span>Tempo dedicado</span>
              <b>{formatHours(panel.studiedMinutes)}</b>
            </div>
          </div>

          <details className="collapsible-section" style={{ marginBottom: 20 }}>
            <summary style={{ fontSize: 13.5, color: "var(--text-muted)", fontWeight: 600 }}>Ver estágio dos cartões</summary>
            <div className="collapsible-body sd-summary">
              <div className="sd-sum-item">
                <span>Revisados 1x+</span>
                <b>{panel.reviewedAtLeastOnce}</b>
              </div>
              <div className="sd-sum-item">
                <span>Novos</span>
                <b style={{ color: "var(--wine)" }}>{panel.novoCount}</b>
              </div>
              <div className="sd-sum-item">
                <span>Em aprendizagem</span>
                <b style={{ color: "var(--amber)" }}>{panel.aprendendoCount}</b>
              </div>
              <div className="sd-sum-item">
                <span>Em revisão</span>
                <b style={{ color: "var(--green)" }}>{panel.revisaoCount}</b>
              </div>
              <div className="sd-sum-item">
                <span>Em reaprendizagem</span>
                <b style={{ color: "#6b5a9e" }}>{panel.reaprendizagemCount}</b>
              </div>
              <div className="sd-sum-item">
                <span>Suspensos</span>
                <b style={{ color: "var(--text-muted)" }}>{panel.suspensoCount}</b>
              </div>
            </div>
          </details>

          {panel.totalFlashcards > 0 && (
            <div className="card ebbinghaus-card">
              <h2 className="section-title">Curva de retenção do assunto</h2>
              <RetentionCurve cards={panel.all} />
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {panel.atrasadosCount + panel.dueTodayCount > 0 && (
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
              className={panel.atrasadosCount + panel.dueTodayCount > 0 ? "btn btn-ghost" : "btn btn-primary"}
            >
              Novo flashcard
            </Link>
          </div>

          <FlashcardSection
            title="Precisa de revisão"
            showCount
            defaultOpen={false}
            pageSize={10}
            emptyMessage="Nada pendente por aqui."
            cards={panel.needsReview.map(withSignedUrl)}
            subjectId={subjectId}
            topicId={topicId}
          />

          <FlashcardSection
            title="Consolidados"
            emptyMessage="Nenhum cartão consolidado ainda. Continue revisando para fortalecer sua memória."
            cards={panel.consolidated.map(withSignedUrl)}
            subjectId={subjectId}
            topicId={topicId}
          />

          <FlashcardSection
            title="Todos os flashcards deste assunto"
            defaultOpen={false}
            emptyMessage="Nenhum flashcard criado neste assunto."
            cards={panel.all}
            subjectId={subjectId}
            topicId={topicId}
            lazySign
          />
        </>
      ) : (
        <>
          <div className="qz-summary">
            <div className="sd-sum-item card" style={{ flex: "unset", minWidth: 140 }}>
              <span>Questões feitas</span>
              <b>{questionSummary.totalDone}</b>
            </div>
            <div className="sd-sum-item card" style={{ flex: "unset", minWidth: 140 }}>
              <span>Acertos</span>
              <b>{questionSummary.totalCorrect}</b>
            </div>
            <div className="sd-sum-item card" style={{ flex: "unset", minWidth: 140 }}>
              <span>% de acerto</span>
              <b>{questionSummary.accuracyPct !== null ? `${questionSummary.accuracyPct}%` : "—"}</b>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <NewQuestionLogButton subjectId={subjectId} topicId={topicId} />
          </div>

          <QuestionLogList subjectId={subjectId} topicId={topicId} logs={questionSummary.logs} />
        </>
      )}
    </div>
  );
}
