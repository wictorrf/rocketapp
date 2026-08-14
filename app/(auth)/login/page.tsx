"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { logInAction, type ActionState } from "@/lib/actions/auth";

const initialState: ActionState = { error: null };

export default function LoginPage() {
  const [state, formAction] = useActionState(logInAction, initialState);

  return (
    <AuthShell
      title="Bem-vinda de volta."
      subtitle="Sua rotina de estudos e sua evolução estão te esperando."
    >
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 600, marginBottom: 22 }}>
        Entrar
      </h2>

      <form action={formAction}>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" placeholder="seuemail@exemplo.com" required />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" placeholder="Sua senha" required />
        </div>
        {state.error && <p className="error-text">{state.error}</p>}
        <SubmitButton pendingText="Entrando...">Entrar</SubmitButton>
      </form>

      <div className="auth-switch">
        Ainda não tem conta? <Link href="/verify-code"><b>Criar conta</b></Link>
      </div>
    </AuthShell>
  );
}
