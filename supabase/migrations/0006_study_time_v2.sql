-- Rocket — Study Time v2 (documento de requisitos novo)
-- focus_sessions ganha um "checkpoint" persistente (fase atual, horário real
-- de início da fase, segundos restantes/líquidos) pra sessão sobreviver a
-- recarregar a página, trocar de aba ou perder conexão — sem depender de
-- estado só em memória do navegador. Também previne sessões simultâneas
-- (só uma linha com ended_at/discarded_at nulos por usuária).

alter table public.focus_sessions
  add column mode text not null default 'pomodoro25'
    check (mode in ('pomodoro25', 'pomodoro50', 'simulado')),
  add column activity_type text not null default 'estudo'
    check (
      activity_type in
      ('aula', 'estudo', 'revisao', 'flashcards', 'questoes', 'simulado_externo', 'resumo', 'trabalho', 'outro')
    ),
  add column activity_type_custom text,
  add column status text not null default 'running'
    check (status in ('running', 'paused', 'finished')),
  add column phase text not null default 'foco'
    check (phase in ('foco', 'descanso', 'pausa_longa', 'simulado')),
  add column cycle_index int not null default 0,
  add column phase_started_at timestamptz not null default now(),
  add column phase_planned_seconds int not null default 1500,
  add column phase_remaining_seconds int not null default 1500,
  add column net_seconds int not null default 0,
  add column question_log_id uuid references public.question_logs (id) on delete set null;

-- Índice parcial: rápido pra achar "a sessão ativa da usuária" (no máximo
-- uma linha viva por vez, aplicado na Server Action, não como constraint
-- rígida — sessões finalizadas continuam existindo pra histórico).
create index focus_sessions_active_idx on public.focus_sessions (user_id) where ended_at is null;

alter table public.profiles
  add column daily_goal_minutes int not null default 120;
