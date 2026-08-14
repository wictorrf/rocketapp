"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SubjectTopicOption } from "@/lib/queries/focus";
import { startFocusSessionAction, finishFocusSessionAction } from "@/lib/actions/focus";

const CYCLE_SECONDS = 25 * 60;
const CYCLES_PLANNED = 4;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusTimer({
  options,
  todayMinutes,
  dailyGoalMinutes,
}: {
  options: SubjectTopicOption[];
  todayMinutes: number;
  dailyGoalMinutes: number;
}) {
  const [selectedTopicId, setSelectedTopicId] = useState(options[0]?.topicId ?? "");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CYCLE_SECONDS);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setElapsedSeconds((e) => e + 1);
          setCyclesCompleted((c) => {
            const next = c + 1;
            if (next >= CYCLES_PLANNED) {
              setRunning(false);
              setFinished(true);
            }
            return next;
          });
          return CYCLE_SECONDS;
        }
        setElapsedSeconds((e) => e + 1);
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (finished && sessionId) {
      finishFocusSessionAction(sessionId, Math.round(elapsedSeconds / 60), cyclesCompleted).then(() =>
        router.refresh(),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  async function handlePlay() {
    if (!selectedTopicId) return;
    if (!sessionId) {
      const selected = options.find((o) => o.topicId === selectedTopicId);
      if (!selected) return;
      const result = await startFocusSessionAction(
        selected.subjectId,
        selected.topicId,
        CYCLE_SECONDS * CYCLES_PLANNED,
        CYCLES_PLANNED,
      );
      if (!result.sessionId) return;
      setSessionId(result.sessionId);
    }
    setRunning(true);
  }

  function handlePause() {
    setRunning(false);
  }

  function handleReset() {
    setRunning(false);
    setSecondsLeft(CYCLE_SECONDS);
  }

  async function handleStop() {
    setRunning(false);
    if (sessionId) {
      await finishFocusSessionAction(sessionId, Math.round(elapsedSeconds / 60), cyclesCompleted);
      router.refresh();
    }
    setSessionId(null);
    setSecondsLeft(CYCLE_SECONDS);
    setCyclesCompleted(0);
    setElapsedSeconds(0);
    setFinished(false);
  }

  const totalTodayMinutes = todayMinutes + Math.round(elapsedSeconds / 60);
  const goalPct = Math.min(100, Math.round((totalTodayMinutes / dailyGoalMinutes) * 100));
  const goalHours = Math.floor(totalTodayMinutes / 60);
  const goalMins = totalTodayMinutes % 60;
  const dailyGoalH = Math.floor(dailyGoalMinutes / 60);

  if (options.length === 0) {
    return (
      <div className="focus-screen">
        <Link href="/home" className="focus-back" aria-label="Voltar">
          ‹
        </Link>
        <p style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", maxWidth: 320 }}>
          Você ainda não tem disciplinas ou assuntos cadastrados. Crie um em Disciplinas antes de
          começar uma sessão de foco.
        </p>
        <Link href="/subjects" className="btn btn-pink" style={{ marginTop: 20 }}>
          Ir para Disciplinas
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="focus-screen">
        <p style={{ color: "#fff", fontSize: 20, fontFamily: "var(--font-display)", marginBottom: 10 }}>
          Sessão concluída 🎉
        </p>
        <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 24 }}>
          {CYCLES_PLANNED} ciclos completos, {Math.round(elapsedSeconds / 60)} minutos registrados.
        </p>
        <Link href="/home" className="btn btn-pink">
          Voltar para a Home
        </Link>
      </div>
    );
  }

  return (
    <div className="focus-screen">
      <Link href="/home" className="focus-back" aria-label="Voltar">
        ‹
      </Link>

      <select
        className="focus-tag-select"
        value={selectedTopicId}
        disabled={running || sessionId !== null}
        onChange={(e) => setSelectedTopicId(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.topicId} value={o.topicId}>
            {o.subjectName}, {o.topicName}
          </option>
        ))}
      </select>

      <div className="timer-ring">
        <div className="tr-label">Tempo de foco</div>
        <div className="tr-cycle">
          Ciclo {Math.min(cyclesCompleted + 1, CYCLES_PLANNED)}/{CYCLES_PLANNED}
        </div>
        <div className="tr-time">{formatTime(secondsLeft)}</div>
      </div>

      <div className="focus-goal">
        <b>Meta do dia</b>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
          {goalHours}h {String(goalMins).padStart(2, "0")}m / {dailyGoalH}h 00m
        </span>
        <div className="fg-track">
          <div className="fg-fill" style={{ width: `${goalPct}%` }} />
        </div>
      </div>

      <div className="focus-controls">
        <button className="fc-btn secondary" onClick={handleReset} aria-label="Reiniciar ciclo">
          ↻
        </button>
        <button
          className="fc-btn play"
          onClick={running ? handlePause : handlePlay}
          aria-label={running ? "Pausar" : "Iniciar"}
        >
          {running ? "❚❚" : "▶"}
        </button>
        <button className="fc-btn secondary" onClick={handleStop} aria-label="Encerrar sessão">
          ■
        </button>
      </div>
    </div>
  );
}
