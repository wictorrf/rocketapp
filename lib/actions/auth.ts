"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

const CODE_ERROR = "Código inválido, expirado ou já utilizado.";

// Só confere se o código existe, está dentro da validade e não foi usado —
// não marca como usado ainda (isso só acontece quando a conta é criada de
// fato, em signUpAction, pra evitar "queimar" um código só por validação).
export async function verifyCodeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Digite o código de verificação." };

  const supabaseAdmin = createServiceRoleClient();
  const { data, error } = await supabaseAdmin
    .from("verification_codes")
    .select("id, used_at, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (error || !data || data.used_at || new Date(data.expires_at) < new Date()) {
    return { error: CODE_ERROR };
  }

  redirect(`/signup?code=${encodeURIComponent(code)}`);
}

export async function signUpAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!code || !email || !password) {
    return { error: "Preencha todos os campos." };
  }
  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const supabaseAdmin = createServiceRoleClient();
  const { data: codeRow, error: codeError } = await supabaseAdmin
    .from("verification_codes")
    .select("id, used_at, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (
    codeError ||
    !codeRow ||
    codeRow.used_at ||
    new Date(codeRow.expires_at) < new Date()
  ) {
    return { error: CODE_ERROR };
  }

  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !signUpData.user) {
    return {
      error:
        signUpError?.code === "user_already_exists"
          ? "Já existe uma conta com esse e-mail."
          : "Não foi possível criar a conta. Tente novamente.",
    };
  }

  // Código só é marcado como usado depois que a conta foi criada com sucesso.
  await supabaseAdmin
    .from("verification_codes")
    .update({
      used_at: new Date().toISOString(),
      used_by: signUpData.user.id,
      used_by_email: email,
    })
    .eq("id", codeRow.id);

  redirect("/personalize");
}

export async function logInAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha incorretos." };

  redirect("/dashboard");
}

export async function logOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
