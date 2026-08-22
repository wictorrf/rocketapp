-- Rocket — Flashcards v2: substitui o algoritmo SM-2 pelo FSRS (documento
-- de requisitos novo). Sem usuárias reais com flashcards ainda, então
-- recriamos o estado do zero em vez de migrar dado histórico.

drop table if exists public.flashcard_srs_state;
drop table if exists public.review_logs;

create table public.flashcard_srs_state (
  flashcard_id uuid primary key references public.flashcards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  state smallint not null default 0, -- ts-fsrs State: 0=New,1=Learning,2=Review,3=Relearning
  due_at timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  learning_steps int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  last_review_at timestamptz,
  suspended_at timestamptz,
  reset_at timestamptz,
  fsrs_version text not null default 'ts-fsrs@5.4.1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.flashcard_srs_state enable row level security;
create index flashcard_srs_state_due_at_idx on public.flashcard_srs_state (user_id, due_at);

create policy "dona do próprio estado de repetição espaçada"
  on public.flashcard_srs_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recria o trigger (a função já existe do schema inicial, só garante que o
-- insert automático continua funcionando com a tabela recriada).
drop trigger if exists on_flashcard_created on public.flashcards;
create trigger on_flashcard_created
  after insert on public.flashcards
  for each row execute function public.handle_new_flashcard();

create table public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  session_id uuid references public.review_sessions (id) on delete set null,
  rating smallint not null check (rating between 1 and 4), -- ts-fsrs Rating: 1=Again,2=Hard,3=Good,4=Easy
  state_before smallint not null,
  state_after smallint not null,
  due_before timestamptz not null,
  due_after timestamptz not null,
  stability_before double precision not null,
  stability_after double precision not null,
  difficulty_before double precision not null,
  difficulty_after double precision not null,
  scheduled_days int not null,
  elapsed_days int not null,
  fsrs_version text not null default 'ts-fsrs@5.4.1',
  reviewed_at timestamptz not null default now()
);

alter table public.review_logs enable row level security;
create index review_logs_flashcard_id_idx on public.review_logs (flashcard_id);
create index review_logs_user_reviewed_at_idx on public.review_logs (user_id, reviewed_at);

create policy "dona do próprio histórico de revisões"
  on public.review_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Backfill: garante estado FSRS pra qualquer flashcard que já exista (sem
-- usuárias reais ainda, isso deve afetar zero ou pouquíssimas linhas).
insert into public.flashcard_srs_state (flashcard_id, user_id)
select id, user_id from public.flashcards
on conflict (flashcard_id) do nothing;

alter table public.flashcards
  add column tags text[] not null default '{}',
  add column back_image_url text;
