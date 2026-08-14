import { createServiceRoleClient } from "@/lib/supabase/server";

export type VerificationCodeRow = {
  id: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  used_by_email: string | null;
  created_at: string;
};

export type CodeStatus = "available" | "used" | "expired";

export function codeStatus(row: VerificationCodeRow): CodeStatus {
  if (row.used_at) return "used";
  if (new Date(row.expires_at) < new Date()) return "expired";
  return "available";
}

export async function listVerificationCodes(): Promise<VerificationCodeRow[]> {
  const supabaseAdmin = createServiceRoleClient();
  const { data } = await supabaseAdmin
    .from("verification_codes")
    .select("id, code, expires_at, used_at, used_by_email, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}
