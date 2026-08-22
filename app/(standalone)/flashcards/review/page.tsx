import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getAllDueFlashcardsForUser } from "@/lib/queries/review";
import { getSignedUrls } from "@/lib/queries/storage";
import { ReviewSession } from "@/components/subjects/ReviewSession";

export default async function MixedReviewPage({
  searchParams,
}: PageProps<"/flashcards/review">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { session } = await searchParams;
  const sessionId = Array.isArray(session) ? session[0] : session;
  if (!sessionId) redirect("/flashcards");

  const { cards, composition } = await getAllDueFlashcardsForUser(profile.userId);
  if (cards.length === 0) redirect("/flashcards");

  const imagePaths = cards.flatMap((c) => [c.imageUrl, c.backImageUrl]).filter((p): p is string => Boolean(p));
  const signedUrls = await getSignedUrls("flashcard-images", imagePaths);
  const cardsWithSignedUrls = cards.map((c) => ({
    ...c,
    imageUrl: c.imageUrl ? (signedUrls.get(c.imageUrl) ?? null) : null,
    backImageUrl: c.backImageUrl ? (signedUrls.get(c.backImageUrl) ?? null) : null,
  }));

  return (
    <ReviewSession cards={cardsWithSignedUrls} sessionId={sessionId} backHref="/flashcards" composition={composition} />
  );
}
