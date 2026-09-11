"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getActiveSessionAction } from "@/lib/actions/focus";
import type { FocusSessionState } from "@/lib/queries/focus";
import { PHASE_LABEL, formatCountdown } from "@/lib/timer/pomodoro";
import { useFocusPhaseWatcher } from "./useFocusPhaseWatcher";

const POSITION_KEY = "rocket-focus-widget-pos";
// Dimensões aproximadas do widget, só pra manter ele dentro da viewport —
// não precisa bater exatamente com o tamanho renderizado.
const WIDGET_WIDTH = 190;
const WIDGET_HEIGHT = 60;
const MARGIN = 16;
const POLL_INTERVAL_MS = 20_000;

const PHASE_ICON: Record<FocusSessionState["phase"], string> = {
  foco: "🕒",
  descanso: "☕",
  pausa_longa: "☕",
  simulado: "📝",
};

type Position = { x: number; y: number };

function defaultPosition(): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return {
    x: window.innerWidth - WIDGET_WIDTH - MARGIN,
    y: window.innerHeight - WIDGET_HEIGHT - MARGIN * 3, // acima da nav mobile
  };
}

function clampToViewport(pos: Position): Position {
  if (typeof window === "undefined") return pos;
  const maxX = Math.max(MARGIN, window.innerWidth - WIDGET_WIDTH - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - WIDGET_HEIGHT - MARGIN);
  return { x: Math.min(Math.max(MARGIN, pos.x), maxX), y: Math.min(Math.max(MARGIN, pos.y), maxY) };
}

// Widget flutuante da sessão ativa do Study Time, visível em qualquer rota
// do app exceto a própria tela cheia do cronômetro (que vive fora deste
// layout — ver app/focus/page.tsx vs. app/(app)/layout.tsx, então nunca
// ficam montados ao mesmo tempo). Usa o mesmo hook de tick/conclusão que a
// tela cheia (useFocusPhaseWatcher), então som/notificação disparam do
// mesmo jeito estando aqui ou lá.
export function FocusMiniTimer({ initialSession }: { initialSession: FocusSessionState | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(initialSession);
  const { remainingSeconds } = useFocusPhaseWatcher(session, setSession);

  const [position, setPosition] = useState<Position | null>(null);
  const dragState = useRef({ dragging: false, offsetX: 0, offsetY: 0, moved: false });

  // Posição é por dispositivo (localStorage), lida só depois do mount pra
  // não divergir da renderização no servidor — mesma camada já usada pras
  // preferências de som/notificação.
  useEffect(() => {
    let initial: Position;
    try {
      const raw = localStorage.getItem(POSITION_KEY);
      initial = raw ? clampToViewport(JSON.parse(raw) as Position) : defaultPosition();
    } catch {
      initial = defaultPosition();
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosition(initial);

    const onResize = () => setPosition((p) => (p ? clampToViewport(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Re-busca a sessão ativa a cada troca de rota e periodicamente — só pra
  // detectar sessão iniciada/encerrada em outro lugar (outra aba, ou a tela
  // cheia antes de um remount completo do layout). A contagem visível em si
  // já vem do relógio de parede via useFocusPhaseWatcher, não deste polling.
  useEffect(() => {
    let cancelled = false;
    getActiveSessionAction().then((s) => {
      if (!cancelled) setSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const id = setInterval(() => {
      getActiveSessionAction().then((s) => setSession(s));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!position) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { dragging: true, offsetX: e.clientX - position.x, offsetY: e.clientY - position.y, moved: false };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState.current.dragging) return;
    dragState.current.moved = true;
    setPosition(clampToViewport({ x: e.clientX - dragState.current.offsetX, y: e.clientY - dragState.current.offsetY }));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setPosition((p) => {
      if (p) {
        try {
          localStorage.setItem(POSITION_KEY, JSON.stringify(p));
        } catch {
          // localStorage indisponível (aba privada etc.) — só não salva a posição, widget continua funcionando
        }
      }
      return p;
    });
  }

  function handleClick() {
    if (dragState.current.moved) {
      dragState.current.moved = false; // foi arraste, não clique — não navega
      return;
    }
    router.push("/focus");
  }

  if (!session || !position) return null;

  const phase = session.phase;
  const phaseClass = phase === "foco" ? "phase-foco" : phase === "simulado" ? "phase-simulado" : "phase-descanso";

  return (
    <button
      type="button"
      className={`focus-mini-timer ${phaseClass}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      aria-label={`${PHASE_LABEL[phase]}, ${formatCountdown(remainingSeconds)} restantes. Clique pra voltar ao Study Time.`}
    >
      <span className="fmt-icon">{PHASE_ICON[phase]}</span>
      <span className="fmt-body">
        <span className="fmt-label">{PHASE_LABEL[phase]}</span>
        <span className="fmt-time">{formatCountdown(remainingSeconds)} restantes</span>
      </span>
    </button>
  );
}
