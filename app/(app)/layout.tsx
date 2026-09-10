import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { computeStreak } from "@/lib/queries/streak";
import { getUserTimezone } from "@/lib/utils/timezone";
import { AppShell } from "@/components/app-shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (!profile.onboardingCompleted) redirect("/personalize");

  const timeZone = await getUserTimezone();
  const streak = await computeStreak(profile.userId, timeZone);

  return (
    <AppShell
      streak={streak}
      isAdmin={profile.isAdmin}
      displayName={profile.displayName}
      areaLabel={profile.areaLabel}
      photoUrl={profile.photoUrl}
    >
      {children}
    </AppShell>
  );
}
