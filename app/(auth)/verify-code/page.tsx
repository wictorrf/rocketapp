"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { verifyCodeAction, type ActionState } from "@/lib/actions/auth";

const initialState: ActionState = { error: null };

export default function VerifyCodePage() {
  const [state, formAction] = useActionState(verifyCodeAction, initialState);

  return (
    <AuthShell
      title="Antes de tudo, confirme seu código."
      subtitle="O código de verificação foi enviado pela Raissa pra você — ele confirma que você faz parte da Comunidade RC."
    >
      <div className="step">Passo 1 de 3</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 600, marginBottom: 8 }}>
        Código de verificação
      </h2>
      <p className="pf-lead">
        Digite o código de uso único que você recebeu para criar sua conta no Rocket.
      </p>

      <form action={formAction}>
        <div className="field">
          <label htmlFor="code">Código de verificação</label>
          <input
            id="code"
            name="code"
            type="text"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="RC-XXXXXX"
            required
          />
        </div>
        {state.error && <p className="error-text">{state.error}</p>}
        <SubmitButton pendingText="Verificando...">Continuar</SubmitButton>
      </form>

      <div className="auth-switch">
        Já tem uma conta? <Link href="/login"><b>Entrar</b></Link>
      </div>
    </AuthShell>
  );
}
