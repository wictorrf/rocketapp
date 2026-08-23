import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getTopic } from "@/lib/queries/topics";
import { listActiveSubjectsWithTopics } from "@/lib/queries/subjects";
import { FlashcardFormStandalone } from "@/components/subjects/FlashcardFormStandalone";

export default async function NewFlashcardPage({
  params,
}: PageProps<"/subjects/[subjectId]/topics/[topicId]/flashcards/new">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { subjectId, topicId } = await params;
  const topic = await getTopic(topicId);
  if (!topic) notFound();

  const subjects = await listActiveSubjectsWithTopics(profile.userId);

  return (
    <FlashcardFormStandalone
      backHref={`/subjects/${subjectId}/topics/${topicId}`}
      subjects={subjects}
      defaultSubjectId={subjectId}
      defaultTopicId={topicId}
    />
  );
}
