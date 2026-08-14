"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { signUpAction, type ActionState } from "@/lib/actions/auth";

const initialState: ActionState = { error: null };

export function SignupForm({ code }: { code: string }) {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <>
      <div className="step">Passo 2 de 3</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 600, marginBottom: 8 }}>
        Criar conta
      </h2>
      <p className="pf-lead">Use o e-mail que você quer usar pra sempre entrar no Rocket.</p>

      <form action={formAction}>
        <input type="hidden" name="code" value={code} />
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" placeholder="seuemail@exemplo.com" required />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Crie uma senha (mín. 8 caracteres)"
            minLength={8}
            required
          />
        </div>
        {state.error && <p className="error-text">{state.error}</p>}
        <SubmitButton pendingText="Criando conta...">Criar conta</SubmitButton>
      </form>

      <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
        Ao criar sua conta, você concorda com os{" "}
        <Link href="/termos" style={{ color: "var(--wine)", fontWeight: 700 }}>
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" style={{ color: "var(--wine)", fontWeight: 700 }}>
          Política de Privacidade
        </Link>
        .
      </p>

      <div className="auth-switch">
        Já tem uma conta? <Link href="/login"><b>Entrar</b></Link>
      </div>
    </>
  );
}
