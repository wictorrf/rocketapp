-- Rocket — Disciplinas: ordenação manual de assuntos (documento de requisitos)
-- Permite arrastar e soltar os assuntos dentro de uma disciplina. Nasce com
-- um valor por assunto (não tudo em 0) usando a ordem de criação atual como
-- ordem manual inicial, pra já ter um resultado estável assim que a opção
-- "Ordem manual" for selecionada pela primeira vez.

alter table public.topics add column sort_order int not null default 0;

update public.topics t
set sort_order = sub.rn
from (
  select id, row_number() over (partition by subject_id order by created_at) as rn
  from public.topics
) sub
where t.id = sub.id;
