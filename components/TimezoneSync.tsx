"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function readTzCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )tz=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Grava o fuso horário real do navegador num cookie público, pra todo
// Server Component poder calcular "hoje" no fuso da usuária em vez do fuso
// do servidor (ver lib/utils/timezone.ts). Só existe pra manter esse cookie
// atualizado — não renderiza nada.
export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || readTzCookie() === detected) return;
    document.cookie = `tz=${encodeURIComponent(detected)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
