"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  return user;
}

function generateCode(): string {
  const raw = crypto.randomUUID().replace(/-/g, "").toUpperCase();
  return `RC-${raw.slice(0, 6)}`;
}

export async function generateCodesAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const quantity = Math.min(100, Math.max(1, Number(formData.get("quantity")) || 1));
  const validDays = Math.min(90, Math.max(1, Number(formData.get("validDays")) || 14));

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validDays);

  const codes = new Set<string>();
  while (codes.size < quantity) codes.add(generateCode());

  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin.from("verification_codes").insert(
    Array.from(codes).map((code) => ({
      code,
      created_by: admin.id,
      expires_at: expiresAt.toISOString(),
    })),
  );

  if (error) return { error: "Não foi possível gerar os códigos. Tente novamente." };

  revalidatePath("/admin/verification-codes");
  return { error: null };
}

export async function deactivateCodeAction(formData: FormData) {
  await requireAdmin();
  const codeId = String(formData.get("codeId") ?? "");
  if (!codeId) return;

  const supabaseAdmin = createServiceRoleClient();
  await supabaseAdmin
    .from("verification_codes")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", codeId);

  revalidatePath("/admin/verification-codes");
}
