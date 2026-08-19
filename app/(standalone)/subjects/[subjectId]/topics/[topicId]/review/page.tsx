import { notFound, redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getTopic } from "@/lib/queries/topics";
import { getDueFlashcardsForReview } from "@/lib/queries/review";
import { getSignedUrls } from "@/lib/queries/storage";
import { ReviewSession } from "@/components/subjects/ReviewSession";

export default async function ReviewPage({
  params,
  searchParams,
}: PageProps<"/subjects/[subjectId]/topics/[topicId]/review">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { subjectId, topicId } = await params;
  const { session } = await searchParams;
  const sessionId = Array.isArray(session) ? session[0] : session;

  const topic = await getTopic(topicId);
  if (!topic) notFound();
  if (!sessionId) redirect(`/subjects/${subjectId}/topics/${topicId}`);

  const cards = await getDueFlashcardsForReview(topicId);
  if (cards.length === 0) redirect(`/subjects/${subjectId}/topics/${topicId}`);

  const imagePaths = cards.map((c) => c.imageUrl).filter((p): p is string => Boolean(p));
  const signedUrls = await getSignedUrls("flashcard-images", imagePaths);
  const cardsWithSignedUrls = cards.map((c) => ({
    ...c,
    imageUrl: c.imageUrl ? (signedUrls.get(c.imageUrl) ?? null) : null,
  }));

  return (
    <ReviewSession
      cards={cardsWithSignedUrls}
      sessionId={sessionId}
      backHref={`/subjects/${subjectId}/topics/${topicId}`}
    />
  );
}
