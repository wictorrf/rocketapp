import Link from "next/link";
import { RocketWordmark } from "@/components/ui/RocketWordmark";

export default function TermsPage() {
  return (
    <div className="legal-wrap">
      <div className="legal-nav">
        <Link href="/">
          <RocketWordmark />
        </Link>
        <Link href="/" style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>
          Voltar
        </Link>
      </div>

      <div className="legal-box">
        <span className="legal-draft-badge">Rascunho — em revisão pela Comunidade RC</span>
        <h1>Termos de Uso</h1>
        <span className="legal-updated">
          Este texto é um rascunho e ainda precisa de revisão e aprovação da Comunidade RC antes de
          valer oficialmente.
        </span>

        <h2>1. Sobre a plataforma</h2>
        <p>
          O Rocket é uma plataforma de estudos exclusiva para membros da Comunidade RC, criada para
          ajudar você a organizar sua rotina de estudo e revisar conteúdo através de repetição
          espaçada.
        </p>

        <h2>2. Acesso e conta</h2>
        <ul>
          <li>
            O acesso é liberado através de um código de verificação de uso único, fornecido pela
            Comunidade RC;
          </li>
          <li>Sua conta é pessoal e intransferível — não compartilhe seu login com outras pessoas;</li>
          <li>Você é responsável por manter sua senha em sigilo.</li>
        </ul>

        <h2>3. Seu conteúdo</h2>
        <p>
          Os flashcards, anotações e demais conteúdos que você cria continuam sendo seus. Você pode
          excluí-los ou excluir sua conta inteira a qualquer momento em Meu Perfil.
        </p>

        <h2>4. O que o Rocket não é</h2>
        <p>
          O Rocket é uma ferramenta de organização de estudos. Ele não substitui orientação
          profissional, supervisão clínica ou o julgamento médico de um profissional qualificado. O
          conteúdo que você cadastra é de sua responsabilidade.
        </p>

        <h2>5. Uso aceitável</h2>
        <p>
          Não é permitido usar a plataforma para fins ilegais, tentar acessar contas de outras
          pessoas, ou tentar burlar o sistema de códigos de verificação. Contas que violem essas
          regras podem ser suspensas.
        </p>

        <h2>6. Mudanças nestes termos</h2>
        <p>
          Podemos atualizar estes termos conforme a plataforma evolui. Mudanças relevantes serão
          comunicadas dentro do próprio Rocket.
        </p>

        <h2>7. Contato</h2>
        <p>Dúvidas sobre estes termos podem ser enviadas para a Comunidade RC.</p>
      </div>
    </div>
  );
}
