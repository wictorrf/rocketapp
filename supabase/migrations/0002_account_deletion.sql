-- Rocket — v2: prepara o schema para exclusão de conta.
--
-- verification_codes.used_by / created_by apontam pra auth.users sem ON
-- DELETE definido (o padrão é NO ACTION), então excluir uma usuária hoje
-- falharia com violação de FK sempre que ela tivesse usado ou gerado algum
-- código. A decisão registrada no plano é manter o código como "usado" para
-- fins de auditoria (a Raissa precisa saber que aquele código foi
-- consumido), mas sem apontar mais pra ninguém — daí ON DELETE SET NULL em
-- vez de CASCADE.

alter table public.verification_codes
  drop constraint verification_codes_used_by_fkey,
  add constraint verification_codes_used_by_fkey
    foreign key (used_by) references auth.users (id) on delete set null;

alter table public.verification_codes
  drop constraint verification_codes_created_by_fkey,
  add constraint verification_codes_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;
