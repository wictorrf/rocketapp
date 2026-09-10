-- Rocket — Dashboard: "Constância de estudos" (documento de requisitos)
-- Sessões de estudo registradas manualmente (retroativas, sem cronômetro
-- rodando) reaproveitam focus_sessions em vez de uma tabela nova — mesmo
-- padrão que registerSimuladoResultAction já usa pra "simulado" (grava em
-- question_logs e linka via focus_sessions.question_log_id). Só precisa de:
-- 1) um campo de observações que a tabela ainda não tem;
-- 2) mais um activity_type ("primeiro_contato", uma das 4 opções do
--    formulário — revisao/questoes/outro já existem);
-- 3) um mode "manual", pra não rotular o registro como um pomodoro que
--    nunca rodou no Histórico do Study Time.

alter table public.focus_sessions add column notes text;

alter table public.focus_sessions drop constraint if exists focus_sessions_activity_type_check;
alter table public.focus_sessions add constraint focus_sessions_activity_type_check
  check (
    activity_type in
    ('aula', 'estudo', 'revisao', 'flashcards', 'questoes', 'simulado_externo', 'resumo', 'trabalho', 'outro', 'primeiro_contato')
  );

alter table public.focus_sessions drop constraint if exists focus_sessions_mode_check;
alter table public.focus_sessions add constraint focus_sessions_mode_check
  check (mode in ('pomodoro25', 'pomodoro50', 'simulado', 'manual'));
