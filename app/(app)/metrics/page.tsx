import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import {
  getMetricsFilterOptions,
  getFlashcardMetrics,
  getQuestionMetrics,
  getStudyTimeMetrics,
  resolvePeriodRange,
  type MetricsPeriod,
  type MetricsFilters,
} from "@/lib/queries/metrics";
import { toLocalDateKey } from "@/lib/utils/format";
import { getUserTimezone } from "@/lib/utils/timezone";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { MetricsFiltersBar } from "@/components/metrics/MetricsFiltersBar";
import { QuestionsSection } from "@/components/metrics/QuestionsSection";
import { StudyDistributionSection } from "@/components/metrics/StudyDistributionSection";
import { FlashcardsSection } from "@/components/metrics/FlashcardsSection";

const VALID_PERIODS: MetricsPeriod[] = ["week", "month", "year", "all"];

export default async function MetricsPage({ searchParams }: PageProps<"/metrics">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const sp = await searchParams;
  const periodRaw = one(sp.period);
  const period: MetricsPeriod = VALID_PERIODS.includes(periodRaw as MetricsPeriod) ? (periodRaw as MetricsPeriod) : "week";
  const hasExplicitPeriod = Boolean(periodRaw);

  const timeZone = await getUserTimezone();
  const todayKey = toLocalDateKey(new Date(), timeZone);
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);
  const year = Number(one(sp.year)) || todayYear;
  const month = Number(one(sp.month)) || todayMonth;
  const weekDateKey = one(sp.date) || todayKey;

  const filters: MetricsFilters = {
    subjectId: one(sp.subjectId) || null,
    topicId: one(sp.topicId) || null,
    activityType: one(sp.activityType) || null,
  };

  const range = resolvePeriodRange(period, { year, month, weekDateKey });

  const [filterOptions, flashcardMetrics, questionMetrics, studyTimeMetrics] = await Promise.all([
    getMetricsFilterOptions(profile.userId),
    getFlashcardMetrics(profile.userId, period, range, timeZone, filters),
    getQuestionMetrics(profile.userId, period, range, filters),
    getStudyTimeMetrics(profile.userId, period, range, filters),
  ]);

  return (
    <div className="metrics-page">
      <h2 className="section-title">Métricas</h2>
      <p className="muted-note" style={{ marginBottom: 18 }}>
        Transforme sua rotina em dados e seus dados em evolução.
      </p>

      <PeriodSelector
        period={period}
        hasExplicitPeriod={hasExplicitPeriod}
        year={year}
        month={month}
        weekDateKey={weekDateKey}
        rangeLabel={range.rangeLabel}
        showTodayShortcut={false}
        inline
      />
      <MetricsFiltersBar subjects={filterOptions} subjectId={filters.subjectId} topicId={filters.topicId} activityType={filters.activityType} />

      <QuestionsSection metrics={questionMetrics} />
      <div style={{ height: 28 }} />
      <StudyDistributionSection metrics={studyTimeMetrics} />
      <div style={{ height: 28 }} />
      <FlashcardsSection metrics={flashcardMetrics} />

      <p className="muted-note" style={{ textAlign: "center", marginTop: 32 }}>
        Quando você entende seus dados, fica mais fácil enxergar seu progresso e escolher melhor onde colocar sua energia.
      </p>
    </div>
  );
}

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}
