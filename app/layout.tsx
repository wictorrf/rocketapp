import type { Metadata } from "next";
import { Playfair_Display, Inter, IBM_Plex_Mono, Dancing_Script, Nunito_Sans } from "next/font/google";
import { RocketIconSprite } from "@/components/ui/RocketIcon";
import { TimezoneSync } from "@/components/TimezoneSync";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
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

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
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
      className={`${playfairDisplay.variable} ${inter.variable} ${plexMono.variable} ${dancingScript.variable} ${nunitoSans.variable}`}
    >
      <body>
        <RocketIconSprite />
        <TimezoneSync />
        {children}
      </body>
    </html>
  );
}
