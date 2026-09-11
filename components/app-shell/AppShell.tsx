"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { FocusSessionState } from "@/lib/queries/focus";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { FocusMiniTimer } from "@/components/focus/FocusMiniTimer";

export function AppShell({
  streak,
  isAdmin,
  displayName,
  areaLabel,
  photoUrl,
  initialActiveSession,
  children,
}: {
  streak: number;
  isAdmin: boolean;
  displayName: string;
  areaLabel: string;
  photoUrl: string | null;
  initialActiveSession: FocusSessionState | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <div className="app">
      <Sidebar streak={streak} isAdmin={isAdmin} />
      <div className="main">
        <TopBar
          streak={streak}
          displayName={displayName}
          areaLabel={areaLabel}
          photoUrl={photoUrl}
          onMenuClick={() => setMobileOpen(true)}
        />
        <div className="content">{children}</div>
      </div>
      <MobileNav streak={streak} isAdmin={isAdmin} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <FocusMiniTimer initialSession={initialActiveSession} />
    </div>
  );
}
