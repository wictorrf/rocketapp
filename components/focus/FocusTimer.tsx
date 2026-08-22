"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SubjectTopicOption, FocusSessionState } from "@/lib/queries/focus";
import {
  startFocusSessionAction,
  pauseFocusSessionAction,
  resumeFocusSessionAction,
  completePhaseAction,
  advanceToNextPhaseAction,
  resetCurrentPhaseAction,
  resetSequenceAction,
  finishFocusSessionAction,
  registerSimuladoResultAction,
} from "@/lib/actions/focus";
import {
  PRESETS,
  PHASE_LABEL,
  MODE_LABEL,
  ACTIVITY_TYPES,
  CYCLES_FOR_LONG_BREAK,
  DEFAULT_SIMULADO_MINUTES,
  SIMULADO_SHORTCUT_MINUTES,
  SIMULADO_MAX_MINUTES,
  formatCountdown,
  activityTypeLabel,
  type Mode,
} from "@/lib/timer/pomodoro";

const SOUND_KEY = "rocket-focus-sound";
const NOTIF_KEY = "rocket-focus-notif";

type ConclusionModal =
  | { kind: "ciclo"; cycleNumber: number }
  | { kind: "sequencia" }
  | { kind: "descanso" }
  | null;

function deriveModal(session: FocusSessionState): ConclusionModal {
  if (session.status !== "running" || session.phaseRemainingSeconds > 0) return null;
  if (session.phase === "foco") {
    // cycle_index só avança em advanceToNextPhaseAction — nesse ponto (fase
    // recém concluída, aguardando decisão) ele ainda reflete o valor de
    // ANTES do ciclo que acabou de terminar.
    const completedCycleNumber = session.cycleIndex + 1;
    return completedCycleNumber % CYCLES_FOR_LONG_BREAK === 0
      ? { kind: "sequencia" }
      : { kind: "ciclo", cycleNumber: completedCycleNumber };
  }
  if (session.phase === "descanso" || session.phase === "pausa_longa") return { kind: "descanso" };
  return null;
}

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

export function FocusTimer({
  options,
  initialSession,
  todayMinutesFromFinished,
  dailyGoalMinutes,
}: {
  options: SubjectTopicOption[];
  initialSession: FocusSessionState | null;
  todayMinutesFromFinished: number;
  dailyGoalMinutes: number;
}) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [conflict, setConflict] = useState<FocusSessionState | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showResetChoice, setShowResetChoice] = useState(false);
  const [showEndChoice, setShowEndChoice] = useState(false);
  const [showSimuladoResult, setShowSimuladoResult] = useState(false);
  const [finishedSummary, setFinishedSummary] = useState<{
    subjectName: string;
    topicName: string;
    activityLabel: string;
    modeLabel: string;
    netMinutes: number;
    cyclesCompleted: number;
  } | null>(null);
  const completingRef = useRef(false);

  // preparação (antes de iniciar)
  const [selectedTopicId, setSelectedTopicId] = useState(options[0]?.topicId ?? "");
  const [mode, setMode] = useState<Mode>("pomodoro25");
  const [simuladoMinutes, setSimuladoMinutes] = useState(DEFAULT_SIMULADO_MINUTES);
  const [activityType, setActivityType] = useState("estudo");
  const [activityTypeCustom, setActivityTypeCustom] = useState("");

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);

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
  }, [nowMs, session, soundEnabled, notifEnabled]);

  const modal = useMemo(() => (session ? deriveModal(session) : null), [session]);

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

  async function handleStart(forceEndPrevious = false) {
    if (!selectedTopicId) return;
    if (activityType === "outro" && !activityTypeCustom.trim()) return;
    const selected = options.find((o) => o.topicId === selectedTopicId);
    if (!selected) return;
    setPending(true);
    setStartError(null);
    const result = await startFocusSessionAction({
      subjectId: selected.subjectId,
      topicId: selected.topicId,
      activityType,
      activityTypeCustom: activityType === "outro" ? activityTypeCustom.trim() : null,
      mode,
      simuladoMinutes,
      forceEndPrevious,
    });
    setPending(false);
    if (result.conflict) {
      setConflict(result.conflict);
      return;
    }
    if (result.error) {
      setStartError(result.error);
      return;
    }
    setConflict(null);
    setStartError(null);
    setFinishedSummary(null);
    if (result.session) setSession(result.session);
  }

  async function handlePause() {
    if (!session) return;
    setPending(true);
    const result = await pauseFocusSessionAction(session.id);
    setPending(false);
    if (result.session) setSession(result.session);
  }

  async function handleResume() {
    if (!session) return;
    setPending(true);
    const result = await resumeFocusSessionAction(session.id);
    setPending(false);
    if (result.session) setSession(result.session);
  }

  async function handleAdvancePhase() {
    if (!session) return;
    setPending(true);
    const result = await advanceToNextPhaseAction(session.id);
    setPending(false);
    if (result.session) setSession(result.session);
  }

  async function handleResetCycle() {
    if (!session) return;
    setShowResetChoice(false);
    setPending(true);
    const result = await resetCurrentPhaseAction(session.id);
    setPending(false);
    if (result.session) setSession(result.session);
  }

  async function handleResetSequence() {
    if (!session) return;
    setShowResetChoice(false);
    setPending(true);
    const result = await resetSequenceAction(session.id);
    setPending(false);
    if (result.session) setSession(result.session);
  }

  async function finalizeSession(discard: boolean) {
    if (!session) return;
    setShowEndChoice(false);
    setPending(true);
    const netMinutes = Math.round(liveNetSeconds / 60);
    await finishFocusSessionAction(session.id, discard);
    setPending(false);
    if (!discard) {
      setFinishedSummary({
        subjectName: session.subjectName,
        topicName: session.topicName,
        activityLabel: activityTypeLabel(session.activityType, session.activityTypeCustom),
        modeLabel: MODE_LABEL[session.mode],
        netMinutes,
        cyclesCompleted: session.cycleIndex,
      });
    }
    setSession(null);
    router.refresh();
  }

  async function handleGuardarSequencia() {
    await finalizeSession(false);
  }

  async function handleComecarOutraSequencia() {
    if (!session) return;
    const prevSubjectId = session.subjectId;
    const prevTopicId = session.topicId;
    const prevActivity = session.activityType;
    const prevActivityCustom = session.activityTypeCustom;
    const prevMode = session.mode;
    setPending(true);
    await finishFocusSessionAction(session.id, false);
    const result = await startFocusSessionAction({
      subjectId: prevSubjectId,
      topicId: prevTopicId,
      activityType: prevActivity,
      activityTypeCustom: prevActivityCustom,
      mode: prevMode,
      simuladoMinutes,
    });
    setPending(false);
    setFinishedSummary(null);
    if (result.session) setSession(result.session);
    router.refresh();
  }

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

  // ---- resumo final (depois de guardar ou descartar) ----
  if (finishedSummary) {
    return (
      <div className="focus-screen">
        <Link href="/dashboard" className="focus-back" aria-label="Voltar">
          ‹
        </Link>
        <div className="focus-summary-box">
          <p className="fs-title">Sessão guardada</p>
          <div className="fs-grid">
            <div>
              <span>Disciplina, assunto</span>
              <b>
                {finishedSummary.subjectName}, {finishedSummary.topicName}
              </b>
            </div>
            <div>
              <span>Tipo de atividade</span>
              <b>{finishedSummary.activityLabel}</b>
            </div>
            <div>
              <span>Modo</span>
              <b>{finishedSummary.modeLabel}</b>
            </div>
            <div>
              <span>Tempo líquido</span>
              <b>{finishedSummary.netMinutes} min</b>
            </div>
            {finishedSummary.cyclesCompleted > 0 && (
              <div>
                <span>Ciclos concluídos</span>
                <b>{finishedSummary.cyclesCompleted}</b>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <Link href="/dashboard" className="btn btn-ghost">
              Concluir
            </Link>
            <button type="button" className="btn btn-pink" onClick={() => setFinishedSummary(null)}>
              Iniciar nova sessão
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- simulado concluído: registrar resultado ----
  if (session && session.status === "finished" && session.mode === "simulado") {
    if (showSimuladoResult) {
      return (
        <SimuladoResultForm
          sessionId={session.id}
          onDone={() => {
            setSession(null);
            setShowSimuladoResult(false);
            router.refresh();
          }}
        />
      );
    }
    return (
      <div className="focus-screen phase-simulado">
        <p className="focus-conclusion-title">Simulado concluído 🚀</p>
        <p className="focus-conclusion-body">
          Você sustentou seu foco por {Math.round(session.netSeconds / 60)} minutos. Agora registre seu
          resultado e transforme essa prática em direção para os próximos estudos.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={() => { setSession(null); router.refresh(); }}>
            Guardar somente o tempo
          </button>
          <button type="button" className="btn btn-pink" onClick={() => setShowSimuladoResult(true)}>
            Registrar resultado
          </button>
        </div>
      </div>
    );
  }

  // ---- preparação (nenhuma sessão ativa) ----
  if (!session) {
    const canStart = Boolean(selectedTopicId) && (activityType !== "outro" || activityTypeCustom.trim().length > 0);
    return (
      <div className="focus-screen">
        <Link href="/dashboard" className="focus-back" aria-label="Voltar">
          ‹
        </Link>
        <Link href="/focus/history" className="focus-history-link">
          Histórico
        </Link>

        {conflict && (
          <div className="modal-overlay" onClick={() => setConflict(null)}>
            <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <h2>Já existe uma sessão em andamento</h2>
              <p className="confirm-dialog-body">
                {conflict.subjectName}, {conflict.topicName} — {MODE_LABEL[conflict.mode]}
              </p>
              <div className="confirm-dialog-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConflict(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={pending}
                  onClick={() => handleStart(true)}
                >
                  Encerrar sessão anterior
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={pending}
                  onClick={() => {
                    setSession(conflict);
                    setConflict(null);
                  }}
                >
                  Voltar para sessão
                </button>
              </div>
            </div>
          </div>
        )}

        <select
          className="focus-tag-select"
          value={selectedTopicId}
          onChange={(e) => setSelectedTopicId(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.topicId} value={o.topicId}>
              {o.subjectName}, {o.topicName}
            </option>
          ))}
        </select>

        <select className="focus-tag-select" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
          {ACTIVITY_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        {activityType === "outro" && (
          <input
            type="text"
            className="focus-plain-input"
            placeholder="Descreva o tipo de atividade"
            value={activityTypeCustom}
            onChange={(e) => setActivityTypeCustom(e.target.value)}
            style={{ marginBottom: 20 }}
          />
        )}

        <div className="focus-mode-select">
          <button type="button" className={mode === "pomodoro25" ? "fm-btn active" : "fm-btn"} onClick={() => setMode("pomodoro25")}>
            25 / 5
          </button>
          <button type="button" className={mode === "pomodoro50" ? "fm-btn active" : "fm-btn"} onClick={() => setMode("pomodoro50")}>
            50 / 10
          </button>
          <button type="button" className={mode === "simulado" ? "fm-btn active" : "fm-btn"} onClick={() => setMode("simulado")}>
            Simulado
          </button>
        </div>

        {mode === "simulado" && (
          <div className="focus-simulado-input">
            Duração do simulado
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {SIMULADO_SHORTCUT_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={simuladoMinutes === m ? "fm-btn active" : "fm-btn"}
                  onClick={() => setSimuladoMinutes(m)}
                >
                  {m} min
                </button>
              ))}
            </div>
            <input
              type="number"
              min={5}
              max={SIMULADO_MAX_MINUTES}
              step={5}
              value={simuladoMinutes}
              onChange={(e) =>
                setSimuladoMinutes(Math.min(SIMULADO_MAX_MINUTES, Math.max(5, Math.round(Number(e.target.value) || 5))))
              }
            />
          </div>
        )}

        <div className="timer-ring">
          <div className="tr-label">{PHASE_LABEL[mode === "simulado" ? "simulado" : "foco"]}</div>
          <div className="tr-time">
            {formatCountdown(mode === "simulado" ? simuladoMinutes * 60 : PRESETS[mode].focusMin * 60)}
          </div>
        </div>

        <div className="focus-goal">
          <b>Meta do dia</b>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {Math.floor(todayMinutesFromFinished / 60)}h {String(todayMinutesFromFinished % 60).padStart(2, "0")}m /{" "}
            {Math.floor(dailyGoalMinutes / 60)}h 00m
          </span>
          <div className="fg-track">
            <div
              className="fg-fill"
              style={{ width: `${Math.min(100, Math.round((todayMinutesFromFinished / dailyGoalMinutes) * 100))}%` }}
            />
          </div>
        </div>

        {startError && <p className="error-text">{startError}</p>}
        <div className="focus-controls">
          <button
            className="fc-btn play"
            disabled={!canStart || pending}
            onClick={() => handleStart(false)}
            aria-label="Iniciar"
          >
            ▶
          </button>
        </div>
      </div>
    );
  }

  // ---- cronômetro ativo ----
  const phaseClass = session.phase === "foco" ? "phase-foco" : session.phase === "simulado" ? "phase-simulado" : "phase-descanso";
  const netMinutesNow = Math.round(liveNetSeconds / 60);
  // cycle_index só avança quando se sai da fase de foco (advanceToNextPhaseAction);
  // no instante em que um foco acaba de terminar (aguardando decisão) ele
  // ainda não conta esse último ciclo — soma 1 pra refletir isso nos pontinhos.
  const dotsCompleted =
    session.phase === "foco" && session.phaseRemainingSeconds <= 0 ? session.cycleIndex + 1 : session.cycleIndex;
  const totalTodayMinutes = todayMinutesFromFinished + netMinutesNow;
  const goalPct = Math.min(100, Math.round((totalTodayMinutes / dailyGoalMinutes) * 100));

  return (
    <div className={`focus-screen ${phaseClass}`}>
      <Link href="/dashboard" className="focus-back" aria-label="Voltar">
        ‹
      </Link>

      <div className="focus-compact-tag">
        {session.subjectName}, {session.topicName}, {activityTypeLabel(session.activityType, session.activityTypeCustom)}
      </div>

      {modal ? (
        <ConclusionCard modal={modal} netMinutesNow={netMinutesNow}
          onIniciarDescanso={handleAdvancePhase}
          onEncerrarPorAgora={() => finalizeSession(false)}
          onGuardarSessao={handleGuardarSequencia}
          onIniciarPausaLonga={handleAdvancePhase}
          onComecarOutraSequencia={handleComecarOutraSequencia}
          onIniciarProximoCiclo={handleAdvancePhase}
          pending={pending}
        />
      ) : (
        <>
          <div className="timer-ring">
            <div className="tr-label">{PHASE_LABEL[session.phase]}</div>
            {session.mode !== "simulado" && session.phase === "foco" && (
              <div className="tr-cycle">
                Ciclo {(session.cycleIndex % CYCLES_FOR_LONG_BREAK) + 1} de {CYCLES_FOR_LONG_BREAK}
              </div>
            )}
            <div className="tr-time">{formatCountdown(remainingSeconds)}</div>
          </div>

          {session.mode !== "simulado" && (
            <div className="focus-cycle-dots">
              {Array.from({ length: CYCLES_FOR_LONG_BREAK }).map((_, i) => (
                <span key={i} className={i < dotsCompleted ? "done" : ""} />
              ))}
            </div>
          )}

          <div className="focus-goal">
            <b>Meta do dia</b>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
              {Math.floor(totalTodayMinutes / 60)}h {String(totalTodayMinutes % 60).padStart(2, "0")}m /{" "}
              {Math.floor(dailyGoalMinutes / 60)}h 00m
            </span>
            <div className="fg-track">
              <div className="fg-fill" style={{ width: `${goalPct}%` }} />
            </div>
          </div>

          <div className="focus-controls">
            <button className="fc-btn secondary" onClick={() => setShowResetChoice(true)} aria-label="Reiniciar" disabled={pending}>
              ↻
            </button>
            <button
              className="fc-btn play"
              onClick={session.status === "running" ? handlePause : handleResume}
              aria-label={session.status === "running" ? "Pausar" : "Retomar"}
              disabled={pending}
            >
              {session.status === "running" ? "❚❚" : "▶"}
            </button>
            <button className="fc-btn secondary" onClick={() => setShowEndChoice(true)} aria-label="Encerrar sessão" disabled={pending}>
              ■
            </button>
          </div>

          <div className="focus-toggles">
            <button type="button" className={soundEnabled ? "ft-toggle active" : "ft-toggle"} onClick={toggleSound}>
              {soundEnabled ? "🔊" : "🔇"} Som
            </button>
            <button type="button" className={notifEnabled ? "ft-toggle active" : "ft-toggle"} onClick={toggleNotifications}>
              {notifEnabled ? "🔔" : "🔕"} Notificações
            </button>
          </div>
        </>
      )}

      {showResetChoice && (
        <div className="modal-overlay" onClick={() => setShowResetChoice(false)}>
          <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Reiniciar</h2>
            <div className="confirm-dialog-actions" style={{ flexDirection: "column" }}>
              <button type="button" className="btn btn-ghost btn-block" onClick={handleResetCycle}>
                Reiniciar somente este ciclo
              </button>
              {session.mode !== "simulado" && (
                <button type="button" className="btn btn-ghost btn-block" onClick={handleResetSequence}>
                  Reiniciar toda a sequência
                </button>
              )}
              <button type="button" className="btn btn-primary btn-block" onClick={() => setShowResetChoice(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndChoice && (
        <div className="modal-overlay" onClick={() => setShowEndChoice(false)}>
          <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>O que deseja fazer com o tempo realizado?</h2>
            <p className="confirm-dialog-body">
              {netMinutesNow} {netMinutesNow === 1 ? "minuto líquido registrado" : "minutos líquidos registrados"} até
              agora.
            </p>
            <div className="confirm-dialog-actions" style={{ flexDirection: "column" }}>
              <button type="button" className="btn btn-primary btn-block" onClick={() => finalizeSession(false)}>
                Guardar tempo estudado
              </button>
              <button type="button" className="btn btn-danger btn-block" onClick={() => finalizeSession(true)}>
                Descartar sessão
              </button>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowEndChoice(false)}>
                Continuar estudando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConclusionCard({
  modal,
  netMinutesNow,
  onIniciarDescanso,
  onEncerrarPorAgora,
  onGuardarSessao,
  onIniciarPausaLonga,
  onComecarOutraSequencia,
  onIniciarProximoCiclo,
  pending,
}: {
  modal: NonNullable<ConclusionModal>;
  netMinutesNow: number;
  onIniciarDescanso: () => void;
  onEncerrarPorAgora: () => void;
  onGuardarSessao: () => void;
  onIniciarPausaLonga: () => void;
  onComecarOutraSequencia: () => void;
  onIniciarProximoCiclo: () => void;
  pending: boolean;
}) {
  if (modal.kind === "ciclo") {
    return (
      <div className="focus-conclusion-card">
        <p className="focus-conclusion-title">Ciclo concluído! 🚀</p>
        <p className="focus-conclusion-body">
          Você avançou mais um bloco com foco. Agora respire, levante um pouco e aproveite sua pausa.
        </p>
        <p className="focus-conclusion-stat">
          {netMinutesNow} min líquidos · ciclo {modal.cycleNumber} de {CYCLES_FOR_LONG_BREAK}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={onEncerrarPorAgora}>
            Encerrar por agora
          </button>
          <button type="button" className="btn btn-pink" disabled={pending} onClick={onIniciarDescanso}>
            Iniciar descanso
          </button>
        </div>
      </div>
    );
  }
  if (modal.kind === "sequencia") {
    return (
      <div className="focus-conclusion-card">
        <p className="focus-conclusion-title">Sequência concluída! 🚀</p>
        <p className="focus-conclusion-body">
          Você completou seus 4 ciclos e transformou seu tempo em progresso. Parabéns por cuidar do seu
          aprendizado com constância!
        </p>
        <p className="focus-conclusion-stat">{netMinutesNow} min líquidos · 4 de 4 ciclos concluídos</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={onGuardarSessao}>
            Guardar sessão
          </button>
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={onIniciarPausaLonga}>
            Iniciar pausa longa
          </button>
          <button type="button" className="btn btn-pink" disabled={pending} onClick={onComecarOutraSequencia}>
            Começar outra sequência
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="focus-conclusion-card">
      <p className="focus-conclusion-title">Pausa concluída!</p>
      <p className="focus-conclusion-body">Sua mente teve um tempo para respirar. Quando estiver pronta, comece o próximo ciclo.</p>
      <button type="button" className="btn btn-pink" disabled={pending} onClick={onIniciarProximoCiclo}>
        Iniciar próximo ciclo
      </button>
    </div>
  );
}

function SimuladoResultForm({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const [questionsDone, setQuestionsDone] = useState(10);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const result = await registerSimuladoResultAction(sessionId, questionsDone, questionsCorrect, note);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className="focus-screen phase-simulado">
      <div className="focus-summary-box">
        <p className="fs-title">Registrar resultado do simulado</p>
        <div className="field">
          <label htmlFor="qd">Questões respondidas</label>
          <input id="qd" type="number" min={1} value={questionsDone} onChange={(e) => setQuestionsDone(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="qc">Acertos</label>
          <input id="qc" type="number" min={0} value={questionsCorrect} onChange={(e) => setQuestionsCorrect(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="note">Observação (opcional)</label>
          <input id="note" type="text" placeholder="Ex: simulado bloco 2" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={onDone}>
            Cancelar
          </button>
          <button type="button" className="btn btn-pink" disabled={pending} onClick={handleSubmit}>
            {pending ? "Salvando..." : "Registrar resultado"}
          </button>
        </div>
      </div>
    </div>
  );
}
