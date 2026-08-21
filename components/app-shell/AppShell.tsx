"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

export function AppShell({
  streak,
  isAdmin,
  displayName,
  areaLabel,
  photoUrl,
  children,
}: {
  streak: number;
  isAdmin: boolean;
  displayName: string;
  areaLabel: string;
  photoUrl: string | null;
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
          displayName={displayName}
          areaLabel={areaLabel}
          photoUrl={photoUrl}
          onMenuClick={() => setMobileOpen(true)}
        />
        <div className="content">{children}</div>
      </div>
      <MobileNav streak={streak} isAdmin={isAdmin} open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </div>
  );
}
