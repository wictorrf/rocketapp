-- Rocket — Ajustes finais (documento de validação, seção "Regra da
-- sequência de estudos"): a sequência precisa contar o dia em que uma
-- atividade do Checklist/Calendário foi CONCLUÍDA, não só criada. Nenhuma
-- das duas tabelas guardava esse instante — só o status atual ("done"),
-- sem timestamp da transição — então não dava pra saber em que dia local a
-- conclusão aconteceu. Coluna opcional, preenchida pelas Server Actions que
-- trocam o status (lib/actions/calendar.ts).

-- "if not exists": calendar_tasks.completed_at já existia no banco (criada
-- fora do histórico de migrations) quando esta migração foi escrita.
alter table public.calendar_tasks add column if not exists completed_at timestamptz;
alter table public.monthly_plan_actions add column if not exists completed_at timestamptz;
