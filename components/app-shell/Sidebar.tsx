"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RocketWordmark } from "@/components/ui/RocketWordmark";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({ streak }: { streak: number }) {
  const pathname = usePathname();

  return (
    <div className="sidebar">
      <div>
        <RocketWordmark onDark />
        <span className="rc-badge on-dark" style={{ marginTop: 8 }}>
          Comunidade RC
        </span>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname.startsWith(item.href) ? "active" : ""}
          >
            <span className="ic">{item.icon}</span> {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="streak-mini">
          🔥{" "}
          <span>
            Sequência atual: <b>{streak} {streak === 1 ? "dia" : "dias"}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
