import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "./storage";
import { AREA_LABEL, type Area } from "@/lib/constants/title-map";

export type GenderTreatment = "a" | "o" | "x";

export type CurrentUserProfile = {
  userId: string;
  displayName: string;
  firstName: string;
  areaLabel: string;
  photoUrl: string | null;
  onboardingCompleted: boolean;
  isAdmin: boolean;
  dailyGoalMinutes: number;
  genderTreatment: GenderTreatment | null;
};

// Usado no layout de (app): se não houver sessão ou perfil, quem chama decide
// o redirect (não faz sentido essa função redirecionar por conta própria).
export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, photo_url, area, onboarding_completed_at, is_admin, daily_goal_minutes, gender_treatment")
    .eq("id", user.id)
    .maybeSingle();

  const photoUrl = await getSignedUrl("avatars", profile?.photo_url);
  const displayName = profile?.full_name || "Você";

  return {
    userId: user.id,
    displayName,
    firstName: displayName.trim().split(/\s+/)[0] ?? displayName,
    areaLabel: profile?.area ? AREA_LABEL[profile.area as Area] : "",
    photoUrl,
    onboardingCompleted: Boolean(profile?.onboarding_completed_at),
    isAdmin: Boolean(profile?.is_admin),
    dailyGoalMinutes: profile?.daily_goal_minutes ?? 120,
    genderTreatment: (profile?.gender_treatment as GenderTreatment | null) ?? null,
  };
}

export type ProfileForEdit = {
  email: string;
  fullName: string;
  area: Area;
  photoUrl: string | null;
  dailyGoalMinutes: number;
  genderTreatment: GenderTreatment | null;
};

// Dados crus (não formatados pra exibição) usados no formulário de edição
// em Meu Perfil.
export async function getProfileForEdit(): Promise<ProfileForEdit | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, photo_url, area, daily_goal_minutes, gender_treatment")
    .eq("id", user.id)
    .maybeSingle();

  const photoUrl = await getSignedUrl("avatars", profile?.photo_url);

  return {
    email: user.email ?? "",
    fullName: profile?.full_name ?? "",
    area: (profile?.area as Area) ?? "medicina",
    photoUrl,
    dailyGoalMinutes: profile?.daily_goal_minutes ?? 120,
    genderTreatment: (profile?.gender_treatment as GenderTreatment | null) ?? null,
  };
}
