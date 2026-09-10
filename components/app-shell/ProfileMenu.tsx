"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logOutAction } from "@/lib/actions/auth";

// Mesmo padrão de dropdown do KebabMenu (components/ui/KebabMenu.tsx),
// aplicado ao bloco de perfil do cabeçalho — abre ao clicar no bloco ou na
// seta, com as opções de conta/perfil.
export function ProfileMenu({
  displayName,
  areaLabel,
  photoUrl,
}: {
  displayName: string;
  areaLabel: string;
  photoUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="kebab-menu profile-menu" ref={wrapRef}>
      <button type="button" className="profile-chip" onClick={() => setOpen((o) => !o)} aria-label="Abrir menu de perfil">
        {photoUrl ? (
          <img src={photoUrl} alt="" />
        ) : (
          <div className="pc-photo" style={{ width: 40, height: 40, fontSize: 16 }}>
            👤
          </div>
        )}
        <div>
          <div className="pname">{displayName}</div>
          <div className="prole">{areaLabel}</div>
        </div>
        <span className="profile-menu-arrow" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="kebab-dropdown">
          <Link href="/profile" className="kebab-item" onClick={() => setOpen(false)}>
            Meu perfil
          </Link>
          <form action={logOutAction}>
            <button type="submit" className="kebab-item danger">
              Sair da conta
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
