"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { titleForPath } from "./nav-items";

export function TopBar({
  displayName,
  areaLabel,
  photoUrl,
  onMenuClick,
}: {
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
        <Link href="/profile" className="profile-chip">
          {photoUrl ? (
            <img src={photoUrl} alt="" />
          ) : (
            <div
              className="pc-photo"
              style={{ width: 40, height: 40, fontSize: 16 }}
            >
              👤
            </div>
          )}
          <div>
            <div className="pname">{displayName}</div>
            <div className="prole">{areaLabel}</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
