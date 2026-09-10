"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { titleForPath } from "./nav-items";
import { ProfileMenu } from "./ProfileMenu";

export function TopBar({
  streak,
  displayName,
  areaLabel,
  photoUrl,
  onMenuClick,
}: {
  streak: number;
  displayName: string;
  areaLabel: string;
  photoUrl: string | null;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="menu-trigger"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          ☰
        </button>
        <h1>{titleForPath(pathname)}</h1>
      </div>
      <div className="topbar-right">
        <span className="topbar-streak" title={`Sequência atual: ${streak} ${streak === 1 ? "dia" : "dias"}`}>
          🔥 {streak} {streak === 1 ? "dia" : "dias"}
        </span>
        <Link href="/focus" className="btn btn-primary btn-sm">
          🕐 <span className="topbar-study-label">Study Time</span>
        </Link>
        <ProfileMenu displayName={displayName} areaLabel={areaLabel} photoUrl={photoUrl} />
      </div>
    </div>
  );
}
