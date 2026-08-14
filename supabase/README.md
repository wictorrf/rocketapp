# Banco de dados (Supabase)

## Como aplicar

1. Crie um projeto em https://supabase.com/dashboard (plano Free serve para desenvolvimento).
2. Copie `.env.local.example` para `.env.local` e preencha com a URL, a anon key e a service role key do projeto (Project Settings → API).
3. Abra o **SQL Editor** do projeto no painel do Supabase e rode o conteúdo de `migrations/0001_init.sql` — isso cria as tabelas, as policies de RLS e os buckets de Storage (`avatars`, `flashcard-images`).
4. Em **Authentication → Providers → Email**, desligue a opção **"Confirm email"** — o acesso já é controlado pelo código de verificação, então a conta é liberada na hora, sem exigir clique em link de e-mail (decisão registrada no plano de implementação).
5. Depois de criar sua própria conta pelo app, torne-a admin rodando no SQL Editor:
   ```sql
   update public.profiles set is_admin = true where id = '<seu-user-id-aqui>';
   ```
   (o `user_id` aparece em Authentication → Users no painel).

## Migrações futuras

Cada mudança de schema deve virar um novo arquivo `migrations/000N_descricao.sql`, nunca editar `0001_init.sql` depois de aplicado em produção.
