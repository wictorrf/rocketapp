import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { getFlashcardMetrics, getQuestionMetrics, getStudyTimeMetrics, resolvePeriodRange, type MetricsPeriod } from "@/lib/queries/metrics";
import { getTodayChecklist } from "@/lib/queries/home";
import { getUpcomingExamsAndCommitments } from "@/lib/queries/calendar";
import { getWeekStudyConsistency } from "@/lib/queries/streak";
import { listActiveSubjectsWithTopics } from "@/lib/queries/subjects";
import { greetingFor, formatFullDate } from "@/lib/dashboard/greeting";
import { toLocalDateKey } from "@/lib/utils/format";
import { getUserTimezone } from "@/lib/utils/timezone";
import { PeriodSelector } from "@/components/metrics/PeriodSelector";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const VALID_PERIODS: MetricsPeriod[] = ["week", "month", "year"];

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");

  const timeZone = await getUserTimezone();
  const now = new Date();
  const todayKey = toLocalDateKey(now, timeZone);
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);

  const sp = await searchParams;
  const periodRaw = one(sp.period);
  const period: MetricsPeriod = VALID_PERIODS.includes(periodRaw as MetricsPeriod) ? (periodRaw as MetricsPeriod) : "week";
  const hasExplicitPeriod = Boolean(periodRaw);

  const year = Number(one(sp.year)) || todayYear;
  const month = Number(one(sp.month)) || todayMonth;
  const weekDateKey = one(sp.date) || todayKey;

  const range = resolvePeriodRange(period, { year, month, weekDateKey });

  const [flashcardMetrics, questionMetrics, studyTimeMetrics, todayChecklist, upcomingExams, consistency, subjects] = await Promise.all([
    getFlashcardMetrics(profile.userId, period, range, timeZone),
    getQuestionMetrics(profile.userId, period, range),
    getStudyTimeMetrics(profile.userId, period, range),
    getTodayChecklist(profile.userId, timeZone),
    getUpcomingExamsAndCommitments(profile.userId, timeZone),
    getWeekStudyConsistency(profile.userId, timeZone),
    listActiveSubjectsWithTopics(profile.userId),
  ]);

  return (
    <div className="dashboard-page">
      <div className="hero-greet">
        <div>
          <h2>{greetingFor(profile.firstName, profile.genderTreatment)}</h2>
          <div className="sub">{formatFullDate(now, timeZone)}</div>
        </div>
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
        showTodayShortcut={false}
        inline
      />

      <DashboardShell
        subjects={subjects}
        todayChecklist={todayChecklist}
        upcomingExams={upcomingExams}
        indicators={{ flashcardMetrics, questionMetrics, studyTimeMetrics }}
        consistency={consistency}
        todayDateKey={todayKey}
      />
    </div>
  );
}

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}
