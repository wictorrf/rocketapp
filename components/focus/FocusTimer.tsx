"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SubjectTopicOption } from "@/lib/queries/focus";
import { startFocusSessionAction, finishFocusSessionAction } from "@/lib/actions/focus";

type PomodoroPreset = "pomodoro25" | "pomodoro50";
type Mode = PomodoroPreset | "simulado";
type Phase = "focus" | "break" | "longBreak" | "simulado";

const PRESETS: Record<PomodoroPreset, { focusMin: number; breakMin: number; longBreakMin: number }> = {
  pomodoro25: { focusMin: 25, breakMin: 5, longBreakMin: 15 },
  pomodoro50: { focusMin: 50, breakMin: 10, longBreakMin: 30 },
};
const CYCLES_FOR_LONG_BREAK = 4;
const DEFAULT_SIMULADO_MINUTES = 60;

const PHASE_LABEL: Record<Phase, string> = {
  focus: "Tempo de foco",
  break: "Pausa",
  longBreak: "Pausa longa",
  simulado: "Simulado",
};

function initialSecondsFor(mode: Mode, simuladoMinutes: number) {
  return mode === "simulado" ? simuladoMinutes * 60 : PRESETS[mode].focusMin * 60;
}

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
  const [mode, setMode] = useState<Mode>("pomodoro25");
  const [simuladoMinutes, setSimuladoMinutes] = useState(DEFAULT_SIMULADO_MINUTES);
  const [phase, setPhase] = useState<Phase>("focus");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialSecondsFor("pomodoro25", DEFAULT_SIMULADO_MINUTES));
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!running) return;
    const preset = mode === "simulado" ? null : PRESETS[mode];

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          if (phase === "focus" || phase === "simulado") setElapsedSeconds((e) => e + 1);
          return prev - 1;
        }

        // tempo da fase atual acabou
        if (phase === "simulado") {
          setElapsedSeconds((e) => e + 1);
          setRunning(false);
          setFinished(true);
          return 0;
        }
        if (phase === "focus") {
          setElapsedSeconds((e) => e + 1);
          const nextCycles = cyclesCompleted + 1;
          setCyclesCompleted(nextCycles);
          const isLong = nextCycles % CYCLES_FOR_LONG_BREAK === 0;
          setPhase(isLong ? "longBreak" : "break");
          return (isLong ? preset!.longBreakMin : preset!.breakMin) * 60;
        }
        // pausa curta ou longa acabou -> volta pro foco
        setPhase("focus");
        return preset!.focusMin * 60;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase, mode, cyclesCompleted]);

  useEffect(() => {
    if (finished && sessionId) {
      finishFocusSessionAction(sessionId, Math.round(elapsedSeconds / 60), cyclesCompleted).then(() =>
        router.refresh(),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function handleModeChange(next: Mode) {
    setMode(next);
    setPhase(next === "simulado" ? "simulado" : "focus");
    setSecondsLeft(initialSecondsFor(next, simuladoMinutes));
    setCyclesCompleted(0);
  }

  function handleSimuladoMinutesChange(value: number) {
    const clamped = Math.min(300, Math.max(5, value || 5));
    setSimuladoMinutes(clamped);
    if (mode === "simulado") setSecondsLeft(clamped * 60);
  }

  async function handlePlay() {
    if (!selectedTopicId) return;
    if (!sessionId) {
      const selected = options.find((o) => o.topicId === selectedTopicId);
      if (!selected) return;
      const plannedMinutes = mode === "simulado" ? simuladoMinutes : PRESETS[mode].focusMin * CYCLES_FOR_LONG_BREAK;
      const cyclesPlanned = mode === "simulado" ? 1 : CYCLES_FOR_LONG_BREAK;
      const result = await startFocusSessionAction(selected.subjectId, selected.topicId, plannedMinutes, cyclesPlanned);
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
    if (mode === "simulado") {
      setSecondsLeft(simuladoMinutes * 60);
      return;
    }
    const preset = PRESETS[mode];
    if (phase === "longBreak") setSecondsLeft(preset.longBreakMin * 60);
    else if (phase === "break") setSecondsLeft(preset.breakMin * 60);
    else setSecondsLeft(preset.focusMin * 60);
  }

  async function handleStop() {
    setRunning(false);
    if (sessionId) {
      await finishFocusSessionAction(sessionId, Math.round(elapsedSeconds / 60), cyclesCompleted);
      router.refresh();
    }
    setSessionId(null);
    setCyclesCompleted(0);
    setElapsedSeconds(0);
    setFinished(false);
    setPhase(mode === "simulado" ? "simulado" : "focus");
    setSecondsLeft(initialSecondsFor(mode, simuladoMinutes));
  }

  const totalTodayMinutes = todayMinutes + Math.round(elapsedSeconds / 60);
  const goalPct = Math.min(100, Math.round((totalTodayMinutes / dailyGoalMinutes) * 100));
  const goalHours = Math.floor(totalTodayMinutes / 60);
  const goalMins = totalTodayMinutes % 60;
  const dailyGoalH = Math.floor(dailyGoalMinutes / 60);

  if (options.length === 0) {
    return (
      <div className="focus-screen">
        <Link href="/dashboard" className="focus-back" aria-label="Voltar">
          ‹
        </Link>
        <p style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", maxWidth: 320 }}>
          Você ainda não tem disciplinas ou assuntos cadastrados. Crie um em Disciplinas antes de
          começar uma sessão de estudo.
        </p>
        <Link href="/subjects" className="btn btn-pink" style={{ marginTop: 20 }}>
          Ir para Disciplinas
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="focus-screen phase-simulado">
        <p style={{ color: "#fff", fontSize: 20, fontFamily: "var(--font-display)", marginBottom: 10 }}>
          Simulado concluído 🎉
        </p>
        <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 24 }}>
          {Math.round(elapsedSeconds / 60)} minutos registrados.
        </p>
        <Link href="/dashboard" className="btn btn-pink">
          Voltar para a Home
        </Link>
      </div>
    );
  }

  const phaseClass = phase === "break" || phase === "longBreak" ? "phase-break" : phase === "simulado" ? "phase-simulado" : "";
  const started = sessionId !== null;

  return (
    <div className={`focus-screen ${phaseClass}`}>
      <Link href="/dashboard" className="focus-back" aria-label="Voltar">
        ‹
      </Link>

      <select
        className="focus-tag-select"
        value={selectedTopicId}
        disabled={running || started}
        onChange={(e) => setSelectedTopicId(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.topicId} value={o.topicId}>
            {o.subjectName}, {o.topicName}
          </option>
        ))}
      </select>

      {!started && (
        <div className="focus-mode-select">
          <button
            type="button"
            className={mode === "pomodoro25" ? "fm-btn active" : "fm-btn"}
            onClick={() => handleModeChange("pomodoro25")}
          >
            25 / 5
          </button>
          <button
            type="button"
            className={mode === "pomodoro50" ? "fm-btn active" : "fm-btn"}
            onClick={() => handleModeChange("pomodoro50")}
          >
            50 / 10
          </button>
          <button
            type="button"
            className={mode === "simulado" ? "fm-btn active" : "fm-btn"}
            onClick={() => handleModeChange("simulado")}
          >
            Simulado
          </button>
        </div>
      )}

      {!started && mode === "simulado" && (
        <label className="focus-simulado-input">
          Duração do simulado (min)
          <input
            type="number"
            min={5}
            max={300}
            step={5}
            value={simuladoMinutes}
            onChange={(e) => handleSimuladoMinutesChange(Number(e.target.value))}
          />
        </label>
      )}

      <div className="timer-ring">
        <div className="tr-label">{PHASE_LABEL[phase]}</div>
        {mode !== "simulado" && (
          <div className="tr-cycle">
            Ciclo {(cyclesCompleted % CYCLES_FOR_LONG_BREAK) + 1}/{CYCLES_FOR_LONG_BREAK}
          </div>
        )}
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
