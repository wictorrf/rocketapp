import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { computeStreak } from "@/lib/queries/streak";
import { Sidebar } from "@/components/app-shell/Sidebar";
import { TopBar } from "@/components/app-shell/TopBar";
import { MobileNav } from "@/components/app-shell/MobileNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (!profile.onboardingCompleted) redirect("/personalize");

  const streak = await computeStreak(profile.userId);

  return (
    <div className="app">
      <Sidebar streak={streak} />
      <div className="main">
        <TopBar
          displayTitle={profile.displayTitle}
          areaLabel={profile.areaLabel}
          photoUrl={profile.photoUrl}
        />
        <div className="content">{children}</div>
      </div>
      <MobileNav />
    </div>
  );
}
