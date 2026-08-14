"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pathname.startsWith(item.href) ? "active" : ""}
        >
          <span className="ic">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
