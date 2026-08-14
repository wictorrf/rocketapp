import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { listSubjectTopicOptions, getTodayFocusMinutes, DAILY_GOAL_MINUTES } from "@/lib/queries/focus";
import { FocusTimer } from "@/components/focus/FocusTimer";

export default async function FocusPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const [options, todayMinutes] = await Promise.all([
    listSubjectTopicOptions(profile.userId),
    getTodayFocusMinutes(profile.userId),
  ]);

  return <FocusTimer options={options} todayMinutes={todayMinutes} dailyGoalMinutes={DAILY_GOAL_MINUTES} />;
}
