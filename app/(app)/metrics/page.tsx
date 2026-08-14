import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getMetrics, type MetricsPeriod } from "@/lib/queries/metrics";
import { formatHours } from "@/lib/utils/format";
import { PieChart } from "@/components/metrics/PieChart";

const PERIOD_LABEL: Record<MetricsPeriod, string> = {
  week: "Semana",
  month: "Mês",
  all: "Desde o início",
};

function rankClass(pct: number) {
  if (pct < 70) return "low";
  if (pct < 85) return "mid";
  return "high";
}

export default async function MetricsPage({ searchParams }: PageProps<"/metrics">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const { period: periodParam } = await searchParams;
  const period: MetricsPeriod = ["week", "month", "all"].includes(String(periodParam))
    ? (periodParam as MetricsPeriod)
    : "week";

  const metrics = await getMetrics(profile.userId, period);

  const reviewsMax = Math.max(1, ...metrics.reviewsByDay.map((d) => d.value));
  const minutesMax = Math.max(1, ...metrics.studiedMinutesByDay.map((d) => d.value));
  const stageTotal =
    metrics.stageDistribution.novo + metrics.stageDistribution.aprendendo + metrics.stageDistribution.consolidado;

  return (
    <div>
      <div className="metric-tabs">
        {(["week", "month", "all"] as MetricsPeriod[]).map((p) => (
          <Link key={p} href={`/metrics?period=${p}`} className={period === p ? "active" : ""}>
            {PERIOD_LABEL[p]}
          </Link>
        ))}
      </div>

      <h2 className="section-title" style={{ marginTop: 4 }}>
        Flashcards
      </h2>
      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="eyebrow">Revisados em {PERIOD_LABEL[period].toLowerCase()}</div>
          <div className="stat-num">{metrics.flashcardsReviewed}</div>
          <div className="stat-label">flashcards, todas as disciplinas</div>
        </div>
        <div className="card">
          <div className="eyebrow">Taxa de retenção</div>
          <div className="stat-num" style={{ color: "var(--green)" }}>
            {metrics.retentionPct !== null ? `${metrics.retentionPct}%` : "—"}
          </div>
          <div className="stat-label">lembrou fácil ou com esforço</div>
        </div>
        <div className="card-dark">
          <div className="eyebrow">Revisões previstas hoje</div>
          <div className="stat-num" style={{ color: "var(--pink)" }}>
            {metrics.dueTodayCount}
          </div>
          <div className="stat-label" style={{ color: "rgba(255,255,255,0.6)" }}>
            calculado pela curva de revisão
          </div>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 28 }}>
        <div className="card">
          <h2 className="section-title">Flashcards revisados por dia</h2>
          <div className="chart-placeholder">
            {metrics.reviewsByDay.map((d) => (
              <div
                key={d.date}
                className="bar"
                style={{
                  height: `${Math.max(4, (d.value / reviewsMax) * 100)}%`,
                  background: "linear-gradient(180deg, var(--pink), var(--wine-deep))",
                }}
              >
                <span>{d.value}</span>
              </div>
            ))}
          </div>
          <div className="chart-x">
            {metrics.reviewsByDay.map((d, i) => (
              <span key={i}>{d.label}</span>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Estágio dos seus cartões</h2>
          <div className="weak-point low">
            <div className="wp-rank" style={{ color: "var(--wine)" }}>●</div>
            <div className="wp-name">Novos</div>
            <div className="wp-pct" style={{ color: "var(--wine)" }}>{metrics.stageDistribution.novo}</div>
          </div>
          <div className="weak-point mid">
            <div className="wp-rank" style={{ color: "var(--amber)" }}>●</div>
            <div className="wp-name">Aprendendo</div>
            <div className="wp-pct" style={{ color: "var(--amber)" }}>{metrics.stageDistribution.aprendendo}</div>
          </div>
          <div className="weak-point high">
            <div className="wp-rank" style={{ color: "var(--green)" }}>●</div>
            <div className="wp-name">Consolidados</div>
            <div className="wp-pct" style={{ color: "var(--green)" }}>{metrics.stageDistribution.consolidado}</div>
          </div>
          {stageTotal === 0 && (
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 10 }}>
              Crie flashcards para começar a acompanhar essa distribuição.
            </p>
          )}
        </div>
      </div>

      <h2 className="section-title">Questões e simulados</h2>
      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="eyebrow">Questões feitas</div>
          <div className="stat-num">{metrics.questionsSummary.done}</div>
          <div className="stat-label">em {PERIOD_LABEL[period].toLowerCase()}</div>
        </div>
        <div className="card">
          <div className="eyebrow">Acertos</div>
          <div className="stat-num">{metrics.questionsSummary.correct}</div>
          <div className="stat-label">registrados manualmente</div>
        </div>
        <div className="card">
          <div className="eyebrow">% de acerto</div>
          <div className="stat-num">
            {metrics.questionsSummary.accuracyPct !== null ? `${metrics.questionsSummary.accuracyPct}%` : "—"}
          </div>
          <div className="stat-label">separado dos flashcards</div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h2 className="section-title">Horas líquidas de estudo</h2>
          <div className="chart-placeholder">
            {metrics.studiedMinutesByDay.map((d) => (
              <div key={d.date} className="bar" style={{ height: `${Math.max(4, (d.value / minutesMax) * 100)}%` }}>
                <span>{formatHours(d.value)}</span>
              </div>
            ))}
          </div>
          <div className="chart-x">
            {metrics.studiedMinutesByDay.map((d, i) => (
              <span key={i}>{d.label}</span>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Onde focar essa {period === "week" ? "semana" : PERIOD_LABEL[period].toLowerCase()}</h2>
          {metrics.weakestSubjects.length === 0 && (
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
              Ainda não há revisões suficientes nesse período para montar o ranking.
            </p>
          )}
          {metrics.weakestSubjects.map((s, i) => (
            <div key={s.subjectId} className={`weak-point ${rankClass(s.accuracyPct)}`}>
              <div className="wp-rank">{String(i + 1).padStart(2, "0")}</div>
              <div className="wp-name">{s.subjectName}</div>
              <div className="wp-pct">{s.accuracyPct}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h2 className="section-title">Tempo de estudo por matéria</h2>
          <PieChart slices={metrics.timeBySubject} emptyLabel="Sem sessões de Modo Foco nesse período ainda." />
        </div>
        <div className="card">
          <h2 className="section-title">Tempo por tipo de atividade</h2>
          <PieChart
            slices={metrics.timeByActivity}
            emptyLabel="Sem sessões de foco ou revisão registradas nesse período ainda."
          />
        </div>
      </div>
    </div>
  );
}
