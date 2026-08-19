export const NAV_ITEMS = [
  { href: "/home", icon: "⌂", label: "Home" },
  { href: "/calendar", icon: "▦", label: "Calendário" },
  { href: "/metrics", icon: "▤", label: "Métricas" },
  { href: "/subjects", icon: "▥", label: "Disciplinas" },
  { href: "/flashcards", icon: "◫", label: "Flashcards" },
  { href: "/focus", icon: "◷", label: "Modo Foco" },
] as const;

// Mapeia prefixo de rota → título mostrado no topbar (h1).
export const ROUTE_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/home", title: "Painel de Voo" },
  { prefix: "/calendar", title: "Calendário" },
  { prefix: "/metrics", title: "Métricas" },
  { prefix: "/subjects", title: "Disciplinas" },
  { prefix: "/flashcards", title: "Flashcards" },
  { prefix: "/profile", title: "Meu Perfil" },
];

export function titleForPath(pathname: string) {
  return ROUTE_TITLES.find((r) => pathname.startsWith(r.prefix))?.title ?? "Rocket";
}
