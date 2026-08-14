import { createClient } from "@/lib/supabase/server";

export type QuestionLogRow = {
  id: string;
  questions_done: number;
  questions_correct: number;
  note: string | null;
  logged_at: string;
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
    .select("id, questions_done, questions_correct, note, logged_at")
    .eq("topic_id", topicId)
    .order("logged_at", { ascending: false });

  const logs = data ?? [];
  const totalDone = logs.reduce((sum, l) => sum + l.questions_done, 0);
  const totalCorrect = logs.reduce((sum, l) => sum + l.questions_correct, 0);

  return {
    totalDone,
    totalCorrect,
    accuracyPct: totalDone ? Math.round((totalCorrect / totalDone) * 100) : null,
    logs,
  };
}
