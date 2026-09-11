"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { completePhaseAction } from "@/lib/actions/focus";
import type { FocusSessionState } from "@/lib/queries/focus";

const SOUND_KEY = "rocket-focus-sound";
const NOTIF_KEY = "rocket-focus-notif";

function playTone(frequency: number, durationMs: number) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // som é um extra — nunca deve quebrar o cronômetro
  }
}

// Tick de relógio (hora real, não decremento visual) + detecção de
// conclusão de fase (som/notificação) + derivação de tempo restante/líquido
// — compartilhado entre a tela cheia (FocusTimer) e o mini timer flutuante
// (FocusMiniTimer). Onde quer que a conclusão de fase seja detectada
// primeiro, o comportamento (tom, notificação, tempo líquido) é idêntico —
// as duas telas nunca podem estar montadas ao mesmo tempo (a tela cheia
// vive em app/focus/page.tsx, fora do layout que renderiza o mini timer),
// então não há risco de completePhaseAction ser chamada em duplicidade.
export function useFocusPhaseWatcher(
  session: FocusSessionState | null,
  setSession: (session: FocusSessionState | null) => void,
) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const completingRef = useRef(false);

  useEffect(() => {
    // localStorage só existe no client; lido depois do mount de propósito, pra não divergir da renderização no servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoundEnabled(localStorage.getItem(SOUND_KEY) !== "0");
    setNotifEnabled(localStorage.getItem(NOTIF_KEY) === "1");
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Detecta e commita a conclusão de fase baseado em hora real (não em
  // contagem visual) — funciona igual recém-terminado ou depois de
  // recarregar a página bem no instante em que a fase acabou.
  useEffect(() => {
    if (!session || session.status !== "running") return;
    if (session.phaseRemainingSeconds <= 0) return; // já commitado, aguardando decisão
    const remaining = session.phaseRemainingSeconds - (nowMs - new Date(session.phaseStartedAt).getTime()) / 1000;
    if (remaining > 0) return;
    if (completingRef.current) return;
    completingRef.current = true;
    const justPhase = session.phase;
    const justMode = session.mode;
    completePhaseAction(session.id).then((result) => {
      completingRef.current = false;
      if (result.session) setSession(result.session);
      if (soundEnabled) {
        if (justPhase === "foco" || justPhase === "simulado") {
          playTone(880, 350);
          setTimeout(() => playTone(1100, 350), 160);
        } else {
          playTone(523, 500);
        }
      }
      if (notifEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const title = justMode === "simulado" ? "Simulado concluído" : justPhase === "foco" ? "Ciclo concluído" : "Pausa concluída";
        new Notification(title, { body: "Volte pro Rocket pra continuar." });
      }
    });
  }, [nowMs, session, soundEnabled, notifEnabled, setSession]);

  const remainingSeconds = useMemo(() => {
    if (!session) return 0;
    if (session.status === "paused" || session.phaseRemainingSeconds <= 0) return Math.max(0, session.phaseRemainingSeconds);
    return Math.max(0, session.phaseRemainingSeconds - (nowMs - new Date(session.phaseStartedAt).getTime()) / 1000);
  }, [session, nowMs]);

  const liveNetSeconds = useMemo(() => {
    if (!session) return 0;
    const runningExtra =
      session.status === "running" && (session.phase === "foco" || session.phase === "simulado") && session.phaseRemainingSeconds > 0
        ? (nowMs - new Date(session.phaseStartedAt).getTime()) / 1000
        : 0;
    return session.netSeconds + runningExtra;
  }, [session, nowMs]);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem(SOUND_KEY, next ? "1" : "0");
  }

  async function toggleNotifications() {
    if (notifEnabled) {
      setNotifEnabled(false);
      localStorage.setItem(NOTIF_KEY, "0");
      return;
    }
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "denied") return; // não insiste depois de recusa
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm === "granted") {
      setNotifEnabled(true);
      localStorage.setItem(NOTIF_KEY, "1");
    }
  }

  return { remainingSeconds, liveNetSeconds, soundEnabled, notifEnabled, toggleSound, toggleNotifications };
}
