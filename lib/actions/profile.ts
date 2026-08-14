"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  computeDisplayTitle,
  type Area,
  type GenderTreatment,
} from "@/lib/constants/title-map";
import { ONBOARDING_QUESTIONS } from "@/lib/constants/onboarding-questions";

export type ActionState = { error: string | null };

export async function savePersonalizeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const area = String(formData.get("area") ?? "") as Area;
  const gender = String(formData.get("gender") ?? "") as GenderTreatment;
  const photo = formData.get("photo");

  if (!fullName || !area || !gender) {
    return { error: "Preencha todos os campos." };
  }

  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, photo, { upsert: true, contentType: photo.type });
    if (uploadError) {
      return { error: "Não foi possível enviar a foto. Tente novamente." };
    }
    photoPath = path;
  }

  const displayTitle = computeDisplayTitle(fullName, area, gender);

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      area,
      gender_treatment: gender,
      display_title: displayTitle,
      ...(photoPath ? { photo_url: photoPath } : {}),
    })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar seu perfil. Tente novamente." };

  redirect("/getting-to-know-you");
}

export async function saveOnboardingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const responses: Record<string, string> = {};
  for (const q of ONBOARDING_QUESTIONS) {
    const value = formData.get(q.column);
    if (value) responses[q.column] = String(value);
  }

  const { error: upsertError } = await supabase
    .from("onboarding_responses")
    .upsert({ user_id: user.id, ...responses });
  if (upsertError) return { error: "Não foi possível salvar suas respostas." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);
  if (profileError) return { error: "Não foi possível concluir o onboarding." };

  redirect("/home");
}

export async function skipOnboardingAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  redirect("/home");
}

// Igual a savePersonalizeAction, mas pra edição em Meu Perfil — fica na
// mesma página em vez de empurrar de volta pro fluxo de onboarding.
export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const area = String(formData.get("area") ?? "") as Area;
  const gender = String(formData.get("gender") ?? "") as GenderTreatment;
  const photo = formData.get("photo");

  if (!fullName || !area || !gender) {
    return { error: "Preencha todos os campos." };
  }

  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, photo, { upsert: true, contentType: photo.type });
    if (uploadError) {
      return { error: "Não foi possível enviar a foto. Tente novamente." };
    }
    photoPath = path;
  }

  const displayTitle = computeDisplayTitle(fullName, area, gender);

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      area,
      gender_treatment: gender,
      display_title: displayTitle,
      ...(photoPath ? { photo_url: photoPath } : {}),
    })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar seu perfil. Tente novamente." };

  revalidatePath("/profile");
  revalidatePath("/home");
  return { error: null };
}

// Apaga a conta por completo: limpa os arquivos da usuária no Storage (não
// cai em cascata de FK) e depois apaga o registro em auth.users — o cascade
// do banco cuida do resto das tabelas (disciplinas, flashcards, sessões
// etc). O código de verificação que ela usou continua marcado como "usado"
// para auditoria, só perde o vínculo com a conta (ver migração 0002).
export async function deleteAccountAction(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServiceRoleClient();

  for (const bucket of ["avatars", "flashcard-images"] as const) {
    const { data: files } = await admin.storage.from(bucket).list(user.id);
    if (files?.length) {
      await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteAccountAction: falha ao excluir usuária", error);
    return { error: "Não foi possível excluir sua conta. Tente novamente ou fale com o suporte." };
  }

  await supabase.auth.signOut();
  redirect("/");
}
