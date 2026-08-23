import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import {
  getFlashcardMetrics,
  getQuestionMetrics,
  getStudyTimeMetrics,
  getActivityCompletionMetrics,
  getActiveDaysAndMonths,
  resolvePeriodRange,
  type MetricsPeriod,
} from "@/lib/queries/metrics";
import { getTodayChecklist, getWeekChecklist, getFlashcardReviewHighlight, getMonthPlanSummary } from "@/lib/queries/home";
import { getUpcomingExamsAndCommitments } from "@/lib/queries/calendar";
import { listActiveSubjectsWithTopics } from "@/lib/queries/subjects";
import { greetingFor, formatFullDate } from "@/lib/dashboard/greeting";
import { MONTH_NAMES_PT } from "@/lib/metrics/calc";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { IndicatorsGrid } from "@/components/dashboard/IndicatorsGrid";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { QuestionLogQuickEntry } from "@/components/dashboard/QuestionLogQuickEntry";

const VALID_PERIODS: MetricsPeriod[] = ["week", "month", "year"];

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const sp = await searchParams;
  const periodRaw = one(sp.period);
  const period: MetricsPeriod = VALID_PERIODS.includes(periodRaw as MetricsPeriod) ? (periodRaw as MetricsPeriod) : "week";
  const hasExplicitPeriod = Boolean(periodRaw);

  const now = new Date();
  const year = Number(one(sp.year)) || now.getFullYear();
  const month = Number(one(sp.month)) || now.getMonth() + 1;
  const weekDateKey = one(sp.date) || now.toISOString().slice(0, 10);

  const range = resolvePeriodRange(period, { year, month, weekDateKey });
  const currentMonthLabel = MONTH_NAMES_PT[now.getMonth()];
  const currentMonthLabelCap = currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1);

  const [
    flashcardMetrics,
    questionMetrics,
    studyTimeMetrics,
    activityMetrics,
    activeDaysAndMonths,
    monthPlanForIndicator,
    todayChecklist,
    weekChecklist,
    flashcardHighlight,
    monthPlanSummary,
    upcomingExams,
    subjects,
  ] = await Promise.all([
    getFlashcardMetrics(profile.userId, period, range),
    getQuestionMetrics(profile.userId, period, range),
    getStudyTimeMetrics(profile.userId, period, range),
    getActivityCompletionMetrics(profile.userId, range),
    period === "year" ? getActiveDaysAndMonths(profile.userId, range) : Promise.resolve(null),
    period === "month" ? getMonthPlanSummary(profile.userId, year, month) : Promise.resolve(null),
    getTodayChecklist(profile.userId),
    getWeekChecklist(profile.userId),
    getFlashcardReviewHighlight(profile.userId),
    getMonthPlanSummary(profile.userId, now.getFullYear(), now.getMonth() + 1),
    getUpcomingExamsAndCommitments(profile.userId),
    listActiveSubjectsWithTopics(profile.userId),
  ]);

  return (
    <div>
      <div className="hero-greet">
        <div>
          <h2>{greetingFor(profile.firstName, profile.genderTreatment)}</h2>
          <div className="sub">{formatFullDate(now)}</div>
        </div>
        <QuestionLogQuickEntry subjects={subjects} />
      </div>

      <PeriodSelector
        period={period}
        hasExplicitPeriod={hasExplicitPeriod}
        year={year}
        month={month}
        weekDateKey={weekDateKey}
        rangeLabel={range.rangeLabel}
        basePath="/dashboard"
        periods={VALID_PERIODS}
      />

      <div style={{ height: 18 }} />
      <IndicatorsGrid
        period={period}
        flashcardMetrics={flashcardMetrics}
        questionMetrics={questionMetrics}
        studyTimeMetrics={studyTimeMetrics}
        activityMetrics={activityMetrics}
        monthPlanProgressPct={monthPlanForIndicator?.progressPct ?? null}
        activeDaysAndMonths={activeDaysAndMonths}
      />

      <DashboardShell
        subjects={subjects}
        todayChecklist={todayChecklist}
        weekChecklist={weekChecklist}
        flashcardHighlight={flashcardHighlight}
        monthPlanSummary={monthPlanSummary}
        monthPlanYear={now.getFullYear()}
        monthPlanMonth={now.getMonth() + 1}
        monthLabel={currentMonthLabelCap}
        upcomingExams={upcomingExams}
      />
    </div>
  );
}

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}
