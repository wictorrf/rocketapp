import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { listSubjectsWithSummary } from "@/lib/queries/subjects";
import { formatRelativeDays, formatHours } from "@/lib/utils/format";
import { NewSubjectForm } from "@/components/subjects/NewSubjectForm";
import { SubjectSearchBar } from "@/components/subjects/SubjectSearchBar";

export default async function SubjectsPage({ searchParams }: PageProps<"/subjects">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { q } = await searchParams;
  const query = Array.isArray(q) ? q[0] : (q ?? "");

  const allSubjects = await listSubjectsWithSummary(profile.userId);
  const subjects = query.trim()
    ? allSubjects.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    : allSubjects;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Suas disciplinas
        </h2>
      </div>

      <NewSubjectForm />
      <SubjectSearchBar initialQuery={query} />

      {subjects.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          {query.trim()
            ? `Nenhuma disciplina encontrada pra "${query}".`
            : "Nenhuma disciplina cadastrada ainda. Crie a primeira acima."}
        </div>
      )}

      {subjects.map((subject) => (
        <Link
          key={subject.id}
          href={`/subjects/${subject.id}/topics`}
          className="subject-row"
          style={{ cursor: "pointer" }}
        >
          <div className="subject-icon">{subject.icon ?? "📚"}</div>
          <div className="subject-info">
            <b>{subject.name}</b>
            <span>
              {subject.topicCount} {subject.topicCount === 1 ? "assunto" : "assuntos"}, última revisão{" "}
              {formatRelativeDays(subject.lastReviewedAt)}
            </span>
          </div>
          <div className="subject-bar">
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${subject.coveragePct}%` }} />
            </div>
            <span>{subject.coveragePct}% de cobertura</span>
          </div>
          <div className="subject-stats">
            <div>
              <b style={subject.accuracyPct !== null && subject.accuracyPct < 65 ? { color: "var(--wine)" } : undefined}>
                {subject.accuracyPct !== null ? `${subject.accuracyPct}%` : "—"}
              </b>
              <span>RETENÇÃO</span>
            </div>
            <div>
              <b>{formatHours(subject.studiedMinutes)}</b>
              <span>ESTUDADAS</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
