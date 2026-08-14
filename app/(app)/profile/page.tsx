import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfileForEdit } from "@/lib/queries/profile";
import { EditProfileForm } from "@/components/profile/EditProfileForm";
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection";

export default async function ProfilePage() {
  const profile = await getProfileForEdit();
  if (!profile) redirect("/login");

  return (
    <div>
      <EditProfileForm profile={profile} />

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="section-title">Privacidade</h2>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Veja o que coletamos e como usamos seus dados na{" "}
          <Link href="/privacidade" style={{ color: "var(--wine)", fontWeight: 700 }}>
            Política de Privacidade
          </Link>{" "}
          e nos{" "}
          <Link href="/termos" style={{ color: "var(--wine)", fontWeight: 700 }}>
            Termos de Uso
          </Link>
          .
        </p>
      </div>

      <DeleteAccountSection />
    </div>
  );
}
