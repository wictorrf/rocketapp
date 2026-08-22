import { createClient } from "@/lib/supabase/server";
import type { QuestionLogType } from "@/lib/constants/question-log-types";

export type QuestionLogRow = {
  id: string;
  questionsDone: number;
  questionsCorrect: number;
  note: string | null;
  loggedAt: string;
  logType: QuestionLogType;
  logTypeCustom: string | null;
};

export type QuestionLogSummary = {
  totalDone: number;
  totalCorrect: number;
  accuracyPct: number | null;
  logs: QuestionLogRow[];
};

export async function getQuestionLogSummary(topicId: string): Promise<QuestionLogSummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("question_logs")
    .select("id, questions_done, questions_correct, note, logged_at, log_type, log_type_custom")
    .eq("topic_id", topicId)
    .order("logged_at", { ascending: false });

  const logs: QuestionLogRow[] = (data ?? []).map((l) => ({
    id: l.id,
    questionsDone: l.questions_done,
    questionsCorrect: l.questions_correct,
    note: l.note,
    loggedAt: l.logged_at,
    logType: ((l.log_type as QuestionLogType | null) ?? "questoes") as QuestionLogType,
    logTypeCustom: l.log_type_custom,
  }));

  const totalDone = logs.reduce((sum, l) => sum + l.questionsDone, 0);
  const totalCorrect = logs.reduce((sum, l) => sum + l.questionsCorrect, 0);

  return {
    totalDone,
    totalCorrect,
    accuracyPct: totalDone ? Math.round((totalCorrect / totalDone) * 100) : null,
    logs,
  };
}
