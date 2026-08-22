-- Rocket — Calendário v2 (documento de requisitos novo)
-- Tipos de evento renovados (remove "Primeiro contato", adiciona os novos),
-- hora de início/hora de término separadas, dia inteiro, status "cancelado",
-- vínculo com registro de questões e com o planejamento mensal. Recorrência
-- continua materializada em linhas reais (mesmo modelo de antes), mas agora
-- com escopo de edição/exclusão ("só este / este e os próximos / todos") via
-- recurrence_group_id, sem o limite artificial de ~3 meses.

-- A constraint precisa liberar 'estudo' ANTES da migração de dados abaixo —
-- senão o UPDATE esbarra na constraint antiga, que ainda não conhece esse valor.
alter table public.calendar_tasks
  drop constraint calendar_tasks_type_check,
  add constraint calendar_tasks_type_check
    check (
      type in
      ('aula', 'estudo', 'revisao', 'questoes', 'prova', 'trabalho', 'compromisso', 'pessoal', 'outro', 'contato')
    );

-- Eventos antigos "Primeiro contato" viram "Estudo", preservando tudo mais.
update public.calendar_tasks set type = 'estudo' where type = 'contato';

-- Agora sim remove 'contato' da lista definitiva de valores permitidos.
alter table public.calendar_tasks
  drop constraint calendar_tasks_type_check,
  add constraint calendar_tasks_type_check
    check (
      type in
      ('aula', 'estudo', 'revisao', 'questoes', 'prova', 'trabalho', 'compromisso', 'pessoal', 'outro')
    );

alter table public.calendar_tasks
  drop constraint calendar_tasks_status_check,
  add constraint calendar_tasks_status_check
    check (status in ('pending', 'done', 'cancelled'));

alter table public.calendar_tasks
  drop constraint calendar_tasks_source_check,
  add constraint calendar_tasks_source_check
    check (source in ('manual', 'planejamento_mensal'));

alter table public.calendar_tasks rename column scheduled_time to start_time;

alter table public.calendar_tasks
  add column type_custom text,
  add column end_date date,
  add column all_day boolean not null default false,
  add column end_time time,
  add column show_in_checklist boolean not null default true,
  add column question_log_id uuid references public.question_logs (id) on delete set null;

-- Ações práticas do planejamento mensal — normalizadas em tabela própria
-- (antes viviam dentro do jsonb de monthly_plans, sem permitir conclusão,
-- arquivamento ou vínculo individual com o Calendário).
create table public.monthly_plan_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.monthly_plans (id) on delete cascade,
  pillar_key text,
  title text not null,
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  scheduled_date date,
  start_time time,
  end_time time,
  type text,
  type_custom text,
  note text,
  color text,
  calendar_task_id uuid references public.calendar_tasks (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'done', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.monthly_plan_actions enable row level security;
create index monthly_plan_actions_plan_id_idx on public.monthly_plan_actions (plan_id);

create policy "dona das próprias ações do planejamento"
  on public.monthly_plan_actions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
