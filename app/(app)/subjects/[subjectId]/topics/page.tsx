import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getSubject } from "@/lib/queries/subjects";
import { listTopicsForSubject, type TopicStatusFilter, type TopicSortKey } from "@/lib/queries/topics";
import { SubjectDetailHeader } from "@/components/subjects/SubjectDetailHeader";
import { NewTopicButton } from "@/components/subjects/NewTopicButton";
import { TopicFilters } from "@/components/subjects/TopicFilters";
import { TopicCard } from "@/components/subjects/TopicCard";
import { formatHours } from "@/lib/utils/format";

const VALID_STATUS: TopicStatusFilter[] = ["all", "active", "archived", "pending", "with_questions"];
const VALID_SORT: TopicSortKey[] = [
  "name",
  "created_desc",
  "last_activity",
  "studied_minutes",
  "flashcard_count",
  "pending_reviews",
];

export default async function SubjectTopicsPage({
  params,
  searchParams,
}: PageProps<"/subjects/[subjectId]/topics">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { subjectId } = await params;
  const subject = await getSubject(subjectId);
  if (!subject) notFound();

  const { q, status: statusParam, sort: sortParam } = await searchParams;
  const query = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");
  const statusRaw = Array.isArray(statusParam) ? statusParam[0] : statusParam;
  const sortRaw = Array.isArray(sortParam) ? sortParam[0] : sortParam;
  const status: TopicStatusFilter = VALID_STATUS.includes(statusRaw as TopicStatusFilter)
    ? (statusRaw as TopicStatusFilter)
    : "active";
  const sort: TopicSortKey = VALID_SORT.includes(sortRaw as TopicSortKey) ? (sortRaw as TopicSortKey) : "name";

  const [topics, activeTopics] = await Promise.all([
    listTopicsForSubject(subjectId, { search: query, status, sort }),
    listTopicsForSubject(subjectId, { status: "active" }),
  ]);

  const totalFlashcards = activeTopics.reduce((s, t) => s + t.totalFlashcards, 0);
  const totalPending = activeTopics.reduce((s, t) => s + t.pendingReviewsCount, 0);
  const totalQuestions = activeTopics.reduce((s, t) => s + t.questionsCount, 0);
  const totalStudied = activeTopics.reduce((s, t) => s + t.studiedMinutes, 0);
  const accuracySamples = activeTopics.filter((t) => t.questionsAccuracyPct !== null);
  const avgAccuracy = accuracySamples.length
    ? Math.round(accuracySamples.reduce((s, t) => s + (t.questionsAccuracyPct ?? 0), 0) / accuracySamples.length)
    : null;

  return (
    <div>
      <SubjectDetailHeader subject={subject} />

      <div className="sd-summary" style={{ marginBottom: 18 }}>
        <div className="sd-sum-item">
          <span>Assuntos</span>
          <b>{activeTopics.length}</b>
        </div>
        <div className="sd-sum-item">
          <span>Flashcards ativos</span>
          <b>{totalFlashcards}</b>
        </div>
        <div className="sd-sum-item">
          <span>Revisões pendentes</span>
          <b style={totalPending > 0 ? { color: "var(--amber)" } : undefined}>{totalPending}</b>
        </div>
        <div className="sd-sum-item">
          <span>Questões registradas</span>
          <b>{totalQuestions}</b>
        </div>
        <div className="sd-sum-item">
          <span>Média de acertos</span>
          <b>{avgAccuracy !== null ? `${avgAccuracy}%` : "—"}</b>
        </div>
        <div className="sd-sum-item">
          <span>Tempo estudado</span>
          <b>{formatHours(totalStudied)}</b>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <NewTopicButton subjectId={subjectId} />
      </div>

      <TopicFilters subjectId={subjectId} initialQuery={query} initialStatus={status} initialSort={sort} />

      {topics.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          {query.trim() && `Nenhum assunto encontrado para "${query}".`}
          {!query.trim() && status === "archived" && "Nenhum assunto arquivado."}
          {!query.trim() && status === "pending" && "Nenhum assunto com revisões pendentes."}
          {!query.trim() && status === "with_questions" && "Nenhum assunto com questões registradas."}
          {!query.trim() &&
            (status === "active" || status === "all") &&
            "Nenhum assunto cadastrado nesta disciplina. Crie o primeiro acima."}
        </div>
      )}

      {topics.map((topic) => (
        <TopicCard key={topic.id} subjectId={subjectId} topic={topic} />
      ))}
    </div>
  );
}
