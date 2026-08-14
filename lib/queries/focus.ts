import { createClient } from "@/lib/supabase/server";

export type SubjectTopicOption = {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
};

export async function listSubjectTopicOptions(userId: string): Promise<SubjectTopicOption[]> {
  const supabase = await createClient();

  const { data: subjects } = await supabase.from("subjects").select("id, name").eq("user_id", userId);
  if (!subjects?.length) return [];
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in(
      "subject_id",
      subjects.map((s) => s.id),
    );

  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
  return (topics ?? []).map((t) => ({
    subjectId: t.subject_id,
    subjectName: subjectNameById.get(t.subject_id) ?? "",
    topicId: t.id,
    topicName: t.name,
  }));
}

export const DAILY_GOAL_MINUTES = 120;

export async function getTodayFocusMinutes(userId: string): Promise<number> {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("focus_sessions")
    .select("actual_minutes")
    .eq("user_id", userId)
    .gte("started_at", startOfDay.toISOString())
    .not("ended_at", "is", null);

  return (data ?? []).reduce((sum, r) => sum + (r.actual_minutes ?? 0), 0);
}
