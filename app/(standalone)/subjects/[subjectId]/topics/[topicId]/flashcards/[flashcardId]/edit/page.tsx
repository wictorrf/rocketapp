import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getTopic } from "@/lib/queries/topics";
import { getFlashcardForEdit } from "@/lib/queries/flashcards";
import { getSignedUrl } from "@/lib/queries/storage";
import { listActiveSubjectsWithTopics } from "@/lib/queries/subjects";
import { FlashcardFormStandalone } from "@/components/subjects/FlashcardFormStandalone";

export default async function EditFlashcardPage({
  params,
}: PageProps<"/subjects/[subjectId]/topics/[topicId]/flashcards/[flashcardId]/edit">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { subjectId, topicId, flashcardId } = await params;
  const topic = await getTopic(topicId);
  if (!topic) notFound();

  const flashcard = await getFlashcardForEdit(flashcardId);
  if (!flashcard || flashcard.topicId !== topicId) notFound();

  const [imageUrl, backImageUrl, subjects] = await Promise.all([
    getSignedUrl("flashcard-images", flashcard.imageUrl),
    getSignedUrl("flashcard-images", flashcard.backImageUrl),
    listActiveSubjectsWithTopics(profile.userId),
  ]);

  return (
    <FlashcardFormStandalone
      backHref={`/subjects/${subjectId}/topics/${topicId}`}
      subjects={subjects}
      flashcard={{ ...flashcard, imageUrl, backImageUrl }}
    />
  );
}
