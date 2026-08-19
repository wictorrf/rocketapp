-- Rocket — v3: agenda completa (cor/emoji/local/notas/recorrência) e
-- planejamento mensal reformulado (pilares, propósito, objetivos, metas,
-- revisão do mês).

alter table public.calendar_tasks
  drop constraint calendar_tasks_type_check,
  add constraint calendar_tasks_type_check
    check (type in ('revisao', 'prova', 'contato', 'ritual', 'aula', 'questoes'));

alter table public.calendar_tasks
  add column color text,
  add column emoji text,
  add column location text,
  add column notes text,
  add column recurrence_group_id uuid;

create index calendar_tasks_recurrence_group_idx on public.calendar_tasks (recurrence_group_id);

-- Marca quando a "revisão do mês" foi preenchida, separado de completed_at
-- (que marca quando o planejamento inicial — missão/pilares/metas — foi feito).
alter table public.monthly_plans
  add column reviewed_at timestamptz;
