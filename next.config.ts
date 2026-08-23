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
};

export default nextConfig;
