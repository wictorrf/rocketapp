import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { listSubjectsWithSummary, type SubjectStatusFilter, type SubjectSortKey } from "@/lib/queries/subjects";
import { NewSubjectButton } from "@/components/subjects/NewSubjectButton";
import { SubjectFilters } from "@/components/subjects/SubjectFilters";
import { SubjectList } from "@/components/subjects/SubjectList";

const VALID_STATUS: SubjectStatusFilter[] = ["all", "active", "archived", "pending"];
const VALID_SORT: SubjectSortKey[] = [
  "name",
  "created_desc",
  "last_activity",
  "studied_minutes",
  "topic_count",
  "flashcard_count",
  "pending_reviews",
  "manual",
];

export default async function SubjectsPage({ searchParams }: PageProps<"/subjects">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { q, status: statusParam, sort: sortParam } = await searchParams;
  const query = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");
  const statusRaw = Array.isArray(statusParam) ? statusParam[0] : statusParam;
  const sortRaw = Array.isArray(sortParam) ? sortParam[0] : sortParam;
  const status: SubjectStatusFilter = VALID_STATUS.includes(statusRaw as SubjectStatusFilter)
    ? (statusRaw as SubjectStatusFilter)
    : "active";
  const sort: SubjectSortKey = VALID_SORT.includes(sortRaw as SubjectSortKey)
    ? (sortRaw as SubjectSortKey)
    : "name";

  const subjects = await listSubjectsWithSummary(profile.userId, { search: query, status, sort });

  return (
    <div className="subjects-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>
            Disciplinas
          </h2>
          <p className="muted-note">Organize seus conteúdos e acompanhe sua evolução em cada matéria.</p>
        </div>
        <NewSubjectButton />
      </div>

      <SubjectFilters initialQuery={query} initialStatus={status} initialSort={sort} />

      {subjects.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 16 }}>
          {query.trim() && `Nenhuma disciplina encontrada para "${query}".`}
          {!query.trim() && status === "archived" && "Nenhuma disciplina arquivada."}
          {!query.trim() && status === "pending" && "Nenhuma disciplina com revisões pendentes."}
          {!query.trim() && (status === "active" || status === "all") && (
            <>Você ainda não criou nenhuma disciplina. Crie a primeira acima.</>
          )}
        </div>
      )}

      <SubjectList subjects={subjects} sort={sort} />
    </div>
  );
}
