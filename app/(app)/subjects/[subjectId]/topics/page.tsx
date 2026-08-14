import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getSubject } from "@/lib/queries/subjects";
import { listTopicsForSubject } from "@/lib/queries/topics";
import { formatRelativeDays } from "@/lib/utils/format";
import { NewTopicForm } from "@/components/subjects/NewTopicForm";

export default async function SubjectTopicsPage({
  params,
}: PageProps<"/subjects/[subjectId]/topics">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { subjectId } = await params;
  const subject = await getSubject(subjectId);
  if (!subject) notFound();

  const topics = await listTopicsForSubject(subjectId);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Link href="/subjects" className="icon-btn" aria-label="Voltar">
          ‹
        </Link>
        <h2 className="section-title" style={{ margin: 0 }}>
          {subject.icon} {subject.name}
        </h2>
      </div>

      <NewTopicForm subjectId={subjectId} />

      {topics.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          Nenhum assunto cadastrado ainda nessa disciplina. Crie o primeiro acima.
        </div>
      )}

      {topics.map((topic) => (
        <Link
          key={topic.id}
          href={`/subjects/${subjectId}/topics/${topic.id}`}
          className="subject-row"
          style={{ cursor: "pointer" }}
        >
          <div className="subject-icon">📖</div>
          <div className="subject-info">
            <b>{topic.name}</b>
            <span>
              {topic.totalFlashcards} {topic.totalFlashcards === 1 ? "flashcard" : "flashcards"}, última
              revisão {formatRelativeDays(topic.lastReviewedAt)}
            </span>
          </div>
          <div className="subject-bar">
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${topic.coveragePct}%` }} />
            </div>
            <span>{topic.coveragePct}% de cobertura</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
