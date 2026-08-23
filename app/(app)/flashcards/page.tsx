import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getFlashcardsHubSummary } from "@/lib/queries/review";
import { listActiveSubjectsWithTopics } from "@/lib/queries/subjects";
import { FlashcardsHubShell } from "@/components/subjects/FlashcardsHubShell";

export default async function FlashcardsHubPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const [summaries, subjects] = await Promise.all([
    getFlashcardsHubSummary(profile.userId),
    listActiveSubjectsWithTopics(profile.userId),
  ]);

  return <FlashcardsHubShell summaries={summaries} subjects={subjects} />;
}
