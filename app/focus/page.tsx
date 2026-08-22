import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { listSubjectTopicOptions, getActiveFocusSession, getTodayNetMinutes } from "@/lib/queries/focus";
import { FocusTimer } from "@/components/focus/FocusTimer";

export default async function FocusPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const [options, activeSession, todayMinutesFromFinished] = await Promise.all([
    listSubjectTopicOptions(profile.userId),
    getActiveFocusSession(profile.userId),
    getTodayNetMinutes(profile.userId),
  ]);

  return (
    <FocusTimer
      options={options}
      initialSession={activeSession}
      todayMinutesFromFinished={todayMinutesFromFinished}
      dailyGoalMinutes={profile.dailyGoalMinutes}
    />
  );
}
