import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getTopic } from "@/lib/queries/topics";
import { getFlashcardForEdit } from "@/lib/queries/flashcards";
import { getSignedUrl } from "@/lib/queries/storage";
import { FlashcardForm } from "@/components/subjects/FlashcardForm";

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

  const [imageUrl, backImageUrl] = await Promise.all([
    getSignedUrl("flashcard-images", flashcard.imageUrl),
    getSignedUrl("flashcard-images", flashcard.backImageUrl),
  ]);

  return (
    <FlashcardForm
      subjectId={subjectId}
      topicId={topicId}
      topicName={topic.name}
      flashcard={{
        id: flashcard.id,
        front: flashcard.front,
        back: flashcard.back,
        tags: flashcard.tags,
        imageUrl,
        backImageUrl,
      }}
    />
  );
}
