import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { computeStreak } from "@/lib/queries/streak";
import { getActiveFocusSession } from "@/lib/queries/focus";
import { getUserTimezone } from "@/lib/utils/timezone";
import { AppShell } from "@/components/app-shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (!profile.onboardingCompleted) redirect("/personalize");

  const timeZone = await getUserTimezone();
  const [streak, initialActiveSession] = await Promise.all([
    computeStreak(profile.userId, timeZone),
    getActiveFocusSession(profile.userId),
  ]);

  return (
    <AppShell
      streak={streak}
      isAdmin={profile.isAdmin}
      displayName={profile.displayName}
      areaLabel={profile.areaLabel}
      photoUrl={profile.photoUrl}
      initialActiveSession={initialActiveSession}
    >
      {children}
    </AppShell>
  );
}
