import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const { code } = await searchParams;
  const codeValue = Array.isArray(code) ? code[0] : code;
  if (!codeValue) redirect("/verify-code");

  return (
    <AuthShell
      title="Cada hora de estudo, registrada. Cada avanço, visível."
      subtitle="Em poucos minutos você organiza sua rotina e começa a acompanhar sua evolução de verdade."
    >
      <SignupForm code={codeValue} />
    </AuthShell>
  );
}
