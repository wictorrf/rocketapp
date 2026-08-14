import Link from "next/link";
import { RocketWordmark } from "@/components/ui/RocketWordmark";

export default function PrivacyPolicyPage() {
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
        <h1>Política de Privacidade</h1>
        <span className="legal-updated">
          Este texto é um rascunho gerado a partir do inventário de dados da plataforma e ainda
          precisa de revisão e aprovação da Comunidade RC antes de valer oficialmente.
        </span>

        <h2>1. Quem somos</h2>
        <p>
          O Rocket é uma plataforma de estudos exclusiva da Comunidade RC, criada por Raissa Alves,
          para organizar a rotina de estudo de estudantes da área da saúde. A Comunidade RC é quem
          decide como e por que seus dados são tratados dentro do Rocket.
        </p>

        <h2>2. Quais dados coletamos</h2>
        <p>Coletamos apenas o necessário para o funcionamento da plataforma:</p>
        <table>
          <thead>
            <tr>
              <th>Dado</th>
              <th>Onde fica</th>
              <th>Por quanto tempo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>E-mail e senha (criptografada)</td>
              <td>Supabase Auth</td>
              <td>Enquanto a conta existir</td>
            </tr>
            <tr>
              <td>Nome, foto de perfil, área de atuação, tratamento</td>
              <td>Banco de dados e armazenamento de arquivos da Supabase</td>
              <td>Enquanto a conta existir</td>
            </tr>
            <tr>
              <td>Respostas do questionário inicial (&quot;Vamos te conhecer&quot;)</td>
              <td>Banco de dados da Supabase</td>
              <td>Enquanto a conta existir</td>
            </tr>
            <tr>
              <td>Disciplinas, assuntos e flashcards criados (incluindo imagens)</td>
              <td>Banco de dados e armazenamento de arquivos da Supabase</td>
              <td>Enquanto a conta existir</td>
            </tr>
            <tr>
              <td>Histórico de revisões, desempenho e sessões de estudo</td>
              <td>Banco de dados da Supabase</td>
              <td>Enquanto a conta existir</td>
            </tr>
            <tr>
              <td>Registros manuais de questões e simulados</td>
              <td>Banco de dados da Supabase</td>
              <td>Enquanto a conta existir</td>
            </tr>
            <tr>
              <td>Qual código de verificação foi usado por qual conta</td>
              <td>Banco de dados da Supabase</td>
              <td>
                Retido para fins de auditoria; se a conta for excluída, o vínculo com sua
                identidade é removido, mas o código continua registrado como usado
              </td>
            </tr>
          </tbody>
        </table>

        <h2>3. Para que usamos esses dados</h2>
        <ul>
          <li>Fazer você entrar e manter sua conta segura;</li>
          <li>Calcular quando cada flashcard deve voltar pra revisão;</li>
          <li>Mostrar sua evolução, constância e pontos de atenção;</li>
          <li>Personalizar a forma como a plataforma se dirige a você.</li>
        </ul>
        <p>Não vendemos nem compartilhamos seus dados com terceiros para fins de publicidade.</p>

        <h2>4. Onde seus dados ficam armazenados</h2>
        <p>
          Usamos a Supabase (banco de dados e armazenamento de arquivos) e a Vercel (hospedagem da
          aplicação), dois provedores de infraestrutura terceirizados amplamente usados no mercado.
        </p>

        <h2>5. Seus direitos</h2>
        <p>Você pode, a qualquer momento:</p>
        <ul>
          <li>Acessar e corrigir seus dados em Meu Perfil;</li>
          <li>Excluir sua conta permanentemente, também em Meu Perfil;</li>
          <li>Pedir esclarecimentos sobre como seus dados são usados.</li>
        </ul>

        <h2>6. Contato</h2>
        <p>Dúvidas sobre esta política podem ser enviadas para a Comunidade RC.</p>
      </div>
    </div>
  );
}
