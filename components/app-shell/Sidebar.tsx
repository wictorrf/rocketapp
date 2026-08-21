"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RocketWordmark } from "@/components/ui/RocketWordmark";
import { RocketIcon } from "@/components/ui/RocketIcon";
import { NAV_ITEMS } from "./nav-items";
import { logOutAction } from "@/lib/actions/auth";

const COLLAPSE_KEY = "rocket-sidebar-collapsed";

export function Sidebar({ streak, isAdmin }: { streak: number; isAdmin: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // localStorage só existe no client; lido depois do mount de propósito, pra não divergir da renderização no servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className={collapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="sidebar-head">
        {collapsed ? (
          <div style={{ color: "#fff" }}>
            <RocketIcon size={22} />
          </div>
        ) : (
          <RocketWordmark onDark />
        )}
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname.startsWith(item.href) ? "active" : ""}
            data-tooltip={item.label}
          >
            <span className="ic">{item.icon}</span>
            <span className="label">{item.label}</span>
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin/verification-codes"
            className={pathname.startsWith("/admin") ? "active" : ""}
            data-tooltip="Admin"
          >
            <span className="ic">🔑</span>
            <span className="label">Admin</span>
          </Link>
        )}
      </nav>
      <div className="sidebar-foot">
        <div className="streak-mini" title={`Sequência atual: ${streak} ${streak === 1 ? "dia" : "dias"}`}>
          🔥{" "}
          <span className="label">
            Sequência atual: <b>{streak} {streak === 1 ? "dia" : "dias"}</b>
          </span>
        </div>
        <form action={logOutAction}>
          <button type="submit" className="sidebar-logout" data-tooltip="Sair da conta">
            <span className="label">Sair da conta</span>
          </button>
        </form>
      </div>
    </div>
  );
}
