# Rocket

App de estudos da Comunidade RC — repetição espaçada (SM-2), calendário, disciplinas/assuntos, métricas e Modo Foco.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). O app não funciona sem um projeto Supabase configurado — siga [supabase/README.md](supabase/README.md) para criar o banco e preencher `.env.local` (copie `.env.local.example`).

## Build de produção

```bash
npm run build
```

O script `build` força `next build --webpack`. Em ambiente local, o download das fontes do Google (`next/font/google`) às vezes falha de forma intermitente durante o build com Turbopack (URLs de `fonts.gstatic.com` retornando 404) — trocar pra webpack reduziu bastante essa instabilidade, mas se o build falhar mesmo assim, rode de novo (é falha de rede pontual buscando as fontes, não um erro de código). Não esperamos isso na Vercel, que tem um caminho de rede mais estável até o Google Fonts — mas vale confirmar no primeiro deploy.

## Estrutura

- `app/` — rotas (App Router), agrupadas por contexto: `(marketing)`, `(auth)`, `(onboarding)`, `(app)` (shell com sidebar), `(standalone)` (telas cheias sem sidebar, ex: novo flashcard e revisão), `admin/`.
- `lib/queries/` — leituras (Server Components).
- `lib/actions/` — Server Actions (mutações).
- `lib/srs/sm2.ts` — algoritmo de repetição espaçada.
- `components/` — organizados por área da UI.
- `supabase/migrations/` — schema do banco, aplicado manualmente via SQL Editor (ver `supabase/README.md`).
