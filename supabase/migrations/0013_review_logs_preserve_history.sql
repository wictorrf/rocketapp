-- Rocket — Checagem FSRS: excluir um flashcard não deve apagar seu
-- histórico de revisões. Hoje review_logs.flashcard_id é "on delete
-- cascade", então excluir o cartão apaga em cascata todas as revisões
-- registradas, alterando retroativamente métricas/retenção de períodos já
-- passados (Dashboard, Métricas, hub de Flashcards somam direto de
-- review_logs). Troca pra "on delete set null" — mesmo padrão já usado
-- nesta própria tabela para session_id — preservando a linha histórica com
-- flashcard_id nulo em vez de apagá-la.
--
-- flashcard_srs_state continua "on delete cascade": é estado vivo do
-- cartão, não um registro histórico — não faz sentido manter estado de
-- repetição espaçada de um cartão que não existe mais.

alter table public.review_logs alter column flashcard_id drop not null;

alter table public.review_logs drop constraint review_logs_flashcard_id_fkey;

alter table public.review_logs
  add constraint review_logs_flashcard_id_fkey
  foreign key (flashcard_id) references public.flashcards (id) on delete set null;
