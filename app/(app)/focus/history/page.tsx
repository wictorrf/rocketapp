import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getFocusHistory } from "@/lib/queries/focus";
import type { Mode } from "@/lib/timer/pomodoro";
import { FocusHistoryFilters } from "@/components/focus/FocusHistoryFilters";
import { FocusHistoryRow } from "@/components/focus/FocusHistoryRow";

const VALID_MODE: (Mode | "all")[] = ["all", "pomodoro25", "pomodoro50", "simulado"];
const VALID_PERIOD: ("week" | "month" | "all")[] = ["all", "week", "month"];

export default async function FocusHistoryPage({ searchParams }: PageProps<"/focus/history">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { q, mode: modeParam, period: periodParam } = await searchParams;
  const query = Array.isArray(q) ? (q[0] ?? "") : (q ?? "");
  const modeRaw = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const periodRaw = Array.isArray(periodParam) ? periodParam[0] : periodParam;
  const mode: Mode | "all" = VALID_MODE.includes(modeRaw as Mode) ? (modeRaw as Mode) : "all";
  const period: "week" | "month" | "all" = VALID_PERIOD.includes(periodRaw as "week") ? (periodRaw as "week") : "all";

  const entries = await getFocusHistory(profile.userId, { search: query, mode, period });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Histórico de sessões
        </h2>
        <Link href="/focus" className="btn btn-pink">
          Nova sessão
        </Link>
      </div>

      <FocusHistoryFilters initialQuery={query} initialMode={mode} initialPeriod={period} />

      {entries.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", marginTop: 16 }}>
          {query.trim()
            ? `Nenhuma sessão encontrada para "${query}".`
            : "Você ainda não concluiu nenhuma sessão de estudo."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {entries.map((entry) => (
          <FocusHistoryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
