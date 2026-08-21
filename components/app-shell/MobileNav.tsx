"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RocketWordmark } from "@/components/ui/RocketWordmark";
import { NAV_ITEMS } from "./nav-items";
import { logOutAction } from "@/lib/actions/auth";

export function MobileNav({
  streak,
  isAdmin,
  open,
  onClose,
}: {
  streak: number;
  isAdmin: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        className={open ? "mobile-nav-backdrop show" : "mobile-nav-backdrop"}
        aria-hidden={!open}
        tabIndex={-1}
        onClick={onClose}
      />
      <nav className={open ? "mobile-drawer open" : "mobile-drawer"} aria-label="Menu principal">
        <div className="sidebar-head">
          <RocketWordmark onDark />
        </div>
        <div className="nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname.startsWith(item.href) ? "active" : ""}
              onClick={onClose}
            >
              <span className="ic">{item.icon}</span>
              <span className="label">{item.label}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/verification-codes"
              className={pathname.startsWith("/admin") ? "active" : ""}
              onClick={onClose}
            >
              <span className="ic">🔑</span>
              <span className="label">Admin</span>
            </Link>
          )}
        </div>
        <div className="sidebar-foot">
          <div className="streak-mini">
            🔥{" "}
            <span className="label">
              Sequência atual: <b>{streak} {streak === 1 ? "dia" : "dias"}</b>
            </span>
          </div>
          <form action={logOutAction}>
            <button type="submit" className="sidebar-logout">
              <span className="label">Sair da conta</span>
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}
