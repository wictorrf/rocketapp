import type { Metadata } from "next";
import { Fraunces, Nunito, IBM_Plex_Mono, Dancing_Script } from "next/font/google";
import { RocketIconSprite } from "@/components/ui/RocketIcon";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Rocket, por Comunidade RC",
  description:
    "Sua rotina de estudos organizada, sua evolução clínica visível todos os dias.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${nunito.variable} ${plexMono.variable} ${dancingScript.variable}`}
    >
      <body>
        <RocketIconSprite />
        {children}
      </body>
    </html>
  );
}
