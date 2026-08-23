import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Padrão do Next.js é 1MB por Server Action — baixo demais pra fotos de
  // perfil e imagens de flashcard (ECG, radiografia) tiradas direto do
  // celular, que facilmente passam disso.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // isomorphic-dompurify usa jsdom por baixo dos panos em ambiente Node.
  // jsdom já está na lista de pacotes auto-externalizados do Next.js, mas
  // isomorphic-dompurify (o pacote que de fato importamos) não está, e o
  // empacotador da Vercel não detecta que ele puxa jsdom — o resultado é um
  // require() de um módulo ESM (via html-encoding-sniffer -> @exodus/bytes)
  // que quebra em runtime só em produção (erro ERR_REQUIRE_ESM). Marcando
  // os dois como externos, o Node resolve via require() nativo do
  // node_modules em vez de passar pelo bundling/tracing do Next.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
};

export default nextConfig;
