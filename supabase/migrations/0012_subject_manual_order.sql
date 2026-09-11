-- Rocket — Disciplinas: ordenação manual (mesmo padrão de 0011_topic_manual_order.sql,
-- agora um nível acima). Nasce com a ordem de criação atual como ordem manual
-- inicial, pra já ter um resultado estável assim que "Ordem manual" for usada.

alter table public.subjects add column sort_order int not null default 0;

update public.subjects s
set sort_order = sub.rn
from (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from public.subjects
) sub
where s.id = sub.id;
