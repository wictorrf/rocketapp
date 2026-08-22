-- Rocket — Disciplinas e Assuntos v2 (documento de requisitos novo)
-- Cor, período, observação e arquivamento pra disciplinas; emoji, cor,
-- etiquetas, observação e arquivamento pra assuntos.

alter table public.subjects
  add column color text,
  add column period text,
  add column note text,
  add column archived_at timestamptz;

alter table public.topics
  add column emoji text,
  add column color text,
  add column tags text[] not null default '{}',
  add column note text,
  add column archived_at timestamptz;

create index subjects_archived_at_idx on public.subjects (user_id, archived_at);
create index topics_archived_at_idx on public.topics (user_id, archived_at);

alter table public.question_logs
  add column log_type text not null default 'questoes'
    check (log_type in ('questoes', 'simulado_externo', 'prova_antiga', 'outro')),
  add column log_type_custom text;
