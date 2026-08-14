import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getTopic } from "@/lib/queries/topics";
import { NewFlashcardForm } from "@/components/subjects/NewFlashcardForm";

export default async function NewFlashcardPage({
  params,
}: PageProps<"/subjects/[subjectId]/topics/[topicId]/flashcards/new">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { subjectId, topicId } = await params;
  const topic = await getTopic(topicId);
  if (!topic) notFound();

  return <NewFlashcardForm subjectId={subjectId} topicId={topicId} topicName={topic.name} />;
}
