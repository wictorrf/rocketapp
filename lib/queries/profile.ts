import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "./storage";
import { AREA_LABEL, type Area } from "@/lib/constants/title-map";

export type CurrentUserProfile = {
  userId: string;
  displayTitle: string;
  areaLabel: string;
  photoUrl: string | null;
  onboardingCompleted: boolean;
  isAdmin: boolean;
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
    .select("full_name, photo_url, area, onboarding_completed_at, is_admin, display_title")
    .eq("id", user.id)
    .maybeSingle();

  const photoUrl = await getSignedUrl("avatars", profile?.photo_url);

  return {
    userId: user.id,
    displayTitle: profile?.display_title || "Você",
    areaLabel: profile?.area ? AREA_LABEL[profile.area as Area] : "",
    photoUrl,
    onboardingCompleted: Boolean(profile?.onboarding_completed_at),
    isAdmin: Boolean(profile?.is_admin),
  };
}

export type ProfileForEdit = {
  email: string;
  fullName: string;
  area: Area;
  genderTreatment: "a" | "o" | "x";
  photoUrl: string | null;
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
    .select("full_name, photo_url, area, gender_treatment")
    .eq("id", user.id)
    .maybeSingle();

  const photoUrl = await getSignedUrl("avatars", profile?.photo_url);

  return {
    email: user.email ?? "",
    fullName: profile?.full_name ?? "",
    area: (profile?.area as Area) ?? "medicina",
    genderTreatment: (profile?.gender_treatment as "a" | "o" | "x") ?? "a",
    photoUrl,
  };
}
