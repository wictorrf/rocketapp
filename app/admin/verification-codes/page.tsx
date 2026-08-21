import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/queries/profile";
import { listVerificationCodes, codeStatus } from "@/lib/queries/admin";
import { deactivateCodeAction } from "@/lib/actions/admin";
import { GenerateCodesForm } from "@/components/admin/GenerateCodesForm";

const STATUS_LABEL = { available: "Disponível", used: "Usado", expired: "Expirado" } as const;

export default async function VerificationCodesAdminPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (!profile.isAdmin) redirect("/dashboard");

  const codes = await listVerificationCodes();

  return (
    <div>
      <h2 className="section-title">Códigos de verificação</h2>
      <GenerateCodesForm />

      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Status</th>
              <th>Usado por</th>
              <th>Expira em</th>
              <th>Criado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {codes.map((row) => {
              const status = codeStatus(row);
              return (
                <tr key={row.id}>
                  <td className="mono">{row.code}</td>
                  <td>
                    <span className={`status-pill ${status}`}>{STATUS_LABEL[status]}</span>
                  </td>
                  <td>{row.used_by_email ?? "—"}</td>
                  <td className="mono">
                    {new Date(row.expires_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="mono">
                    {new Date(row.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td>
                    {status === "available" && (
                      <form action={deactivateCodeAction}>
                        <input type="hidden" name="codeId" value={row.id} />
                        <button type="submit" className="btn btn-ghost btn-sm">
                          Desativar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {codes.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)", textAlign: "center", padding: 24 }}>
                  Nenhum código gerado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
