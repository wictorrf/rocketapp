import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import {
  getFlashcardsHubSummary,
  getFlashcardReviewEvolution,
  getUpcomingReviewLoad,
  getFlashcardStageDistribution,
} from "@/lib/queries/review";
import { listActiveSubjectsWithTopics } from "@/lib/queries/subjects";
import { getUserTimezone } from "@/lib/utils/timezone";
import { FlashcardsHubShell } from "@/components/subjects/FlashcardsHubShell";

export default async function FlashcardsHubPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const timeZone = await getUserTimezone();
  const [summaries, subjects, evolution, upcomingLoad, stageDistribution] = await Promise.all([
    getFlashcardsHubSummary(profile.userId, timeZone),
    listActiveSubjectsWithTopics(profile.userId),
    getFlashcardReviewEvolution(profile.userId, timeZone),
    getUpcomingReviewLoad(profile.userId, timeZone),
    getFlashcardStageDistribution(profile.userId),
  ]);

  return (
    <FlashcardsHubShell
      summaries={summaries}
      subjects={subjects}
      evolution={evolution}
      upcomingLoad={upcomingLoad}
      stageDistribution={stageDistribution}
    />
  );
}
