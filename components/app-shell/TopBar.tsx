"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { titleForPath } from "./nav-items";

export function TopBar({
  displayTitle,
  areaLabel,
  photoUrl,
}: {
  displayTitle: string;
  areaLabel: string;
  photoUrl: string | null;
}) {
  const pathname = usePathname();

  return (
    <div className="topbar">
      <h1>{titleForPath(pathname)}</h1>
      <div className="topbar-right">
        <div className="icon-btn" aria-hidden="true">
          🔔
        </div>
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
            <div className="pname">{displayTitle}</div>
            <div className="prole">{areaLabel}</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
