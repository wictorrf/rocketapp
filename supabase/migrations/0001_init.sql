-- Rocket — schema inicial (v1)
-- Convenção: toda tabela de dado de usuário carrega user_id e tem RLS
-- habilitado com policy "só o dono acessa" (auth.uid() = user_id).

create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  photo_url text,
  area text check (
    area in ('medicina', 'enfermagem', 'psicologia', 'odontologia', 'fisioterapia', 'outra')
  ),
  gender_treatment text check (gender_treatment in ('a', 'o', 'x')),
  display_title text,
  onboarding_completed_at timestamptz,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "usuária vê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "usuária cria o próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "usuária atualiza o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- is_admin nunca é editável pela própria usuária, nem pela API com anon/authenticated key.
-- Vira true manualmente (SQL direto no painel Supabase) quando a Raissa precisar de acesso admin.
revoke update (is_admin) on public.profiles from authenticated;

-- Cria a linha de profile automaticamente quando uma conta é criada no Supabase Auth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- VERIFICATION_CODES
-- Sem policy de select/insert/update pra authenticated/anon — todo acesso
-- passa por Server Action usando a service role key (painel admin da Raissa
-- e a validação no cadastro).
-- ============================================================
create table public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references auth.users (id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users (id),
  used_by_email text, -- espelho do e-mail no momento do uso, só pra facilitar consulta no painel admin
  created_at timestamptz not null default now()
);

alter table public.verification_codes enable row level security;

-- ============================================================
-- ONBOARDING_RESPONSES ("Vamos te conhecer")
-- ============================================================
create table public.onboarding_responses (
  user_id uuid primary key references auth.users (id) on delete cascade,
  course_phase text,
  biggest_challenge text,
  goal_exam text,
  weekly_hours_bracket text,
  study_style text,
  created_at timestamptz not null default now()
);

alter table public.onboarding_responses enable row level security;

create policy "dona dos próprios dados de onboarding"
  on public.onboarding_responses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- SUBJECTS (disciplinas) / TOPICS (assuntos)
-- ============================================================
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text,
  created_at timestamptz not null default now()
);

alter table public.subjects enable row level security;

create policy "dona das próprias disciplinas"
  on public.subjects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.topics enable row level security;
create index topics_subject_id_idx on public.topics (subject_id);

create policy "dona dos próprios assuntos"
  on public.topics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- FLASHCARDS + estado SM-2 + histórico de revisões
-- ============================================================
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  front text not null,
  back text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.flashcards enable row level security;
create index flashcards_topic_id_idx on public.flashcards (topic_id);

create policy "dona dos próprios flashcards"
  on public.flashcards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.flashcard_srs_state (
  flashcard_id uuid primary key references public.flashcards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  repetitions int not null default 0,
  ease_factor numeric(4, 2) not null default 2.5,
  interval_days int not null default 0,
  due_at date not null default current_date,
  last_reviewed_at timestamptz,
  lapses int not null default 0
);

alter table public.flashcard_srs_state enable row level security;
create index flashcard_srs_state_due_at_idx on public.flashcard_srs_state (user_id, due_at);

create policy "dona do próprio estado de repetição espaçada"
  on public.flashcard_srs_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Cria automaticamente o estado SM-2 inicial (estágio "Novo") ao criar um flashcard.
create function public.handle_new_flashcard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.flashcard_srs_state (flashcard_id, user_id)
  values (new.id, new.user_id);
  return new;
end;
$$;

create trigger on_flashcard_created
  after insert on public.flashcards
  for each row execute function public.handle_new_flashcard();

create table public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  cards_total int not null default 0,
  cards_remembered int not null default 0
);

alter table public.review_sessions enable row level security;
create index review_sessions_topic_id_idx on public.review_sessions (topic_id);

create policy "dona das próprias sessões de revisão"
  on public.review_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  session_id uuid references public.review_sessions (id) on delete set null,
  grade smallint not null check (grade in (0, 1, 2)),
  repetitions_before int not null,
  repetitions_after int not null,
  ease_factor_before numeric(4, 2) not null,
  ease_factor_after numeric(4, 2) not null,
  interval_before int not null,
  interval_after int not null,
  reviewed_at timestamptz not null default now()
);

alter table public.review_logs enable row level security;
create index review_logs_flashcard_id_idx on public.review_logs (flashcard_id);
create index review_logs_user_reviewed_at_idx on public.review_logs (user_id, reviewed_at);

create policy "dona do próprio histórico de revisões"
  on public.review_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- QUESTÕES E SIMULADOS (registro manual, separado dos flashcards)
-- ============================================================
create table public.question_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  questions_done int not null check (questions_done > 0),
  questions_correct int not null check (questions_correct >= 0),
  note text,
  logged_at timestamptz not null default now(),
  check (questions_correct <= questions_done)
);

alter table public.question_logs enable row level security;
create index question_logs_topic_id_idx on public.question_logs (topic_id);

create policy "dona dos próprios registros de questões"
  on public.question_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CALENDÁRIO / PLANEJAMENTO MENSAL
-- ============================================================
create table public.calendar_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('revisao', 'prova', 'contato', 'ritual')),
  title text not null,
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  scheduled_date date not null,
  scheduled_time time,
  source text not null default 'manual' check (source in ('system', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'done')),
  created_at timestamptz not null default now()
);

alter table public.calendar_tasks enable row level security;
create index calendar_tasks_user_date_idx on public.calendar_tasks (user_id, scheduled_date);

create policy "dona das próprias tarefas do calendário"
  on public.calendar_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.monthly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month date not null, -- sempre o primeiro dia do mês, ex: 2026-08-01
  goals jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  unique (user_id, month)
);

alter table public.monthly_plans enable row level security;

create policy "dona dos próprios planejamentos mensais"
  on public.monthly_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- MODO FOCO
-- ============================================================
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  planned_minutes int,
  cycles_planned int,
  cycles_completed int,
  actual_minutes int
);

alter table public.focus_sessions enable row level security;
create index focus_sessions_subject_id_idx on public.focus_sessions (subject_id);
create index focus_sessions_topic_id_idx on public.focus_sessions (topic_id);

create policy "dona das próprias sessões de foco"
  on public.focus_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE (fotos de perfil e imagens de flashcard)
-- Convenção de path: sempre "<user_id>/arquivo.ext", pra RLS conseguir
-- comparar o primeiro segmento do path com auth.uid().
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false), ('flashcard-images', 'flashcard-images', false)
on conflict (id) do nothing;

create policy "dona lê os próprios arquivos em avatars"
  on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dona escreve os próprios arquivos em avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dona atualiza os próprios arquivos em avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dona apaga os próprios arquivos em avatars"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dona lê os próprios arquivos em flashcard-images"
  on storage.objects for select
  using (bucket_id = 'flashcard-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dona escreve os próprios arquivos em flashcard-images"
  on storage.objects for insert
  with check (bucket_id = 'flashcard-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dona atualiza os próprios arquivos em flashcard-images"
  on storage.objects for update
  using (bucket_id = 'flashcard-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "dona apaga os próprios arquivos em flashcard-images"
  on storage.objects for delete
  using (bucket_id = 'flashcard-images' and (storage.foldername(name))[1] = auth.uid()::text);
