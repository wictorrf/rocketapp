-- Rocket — Flashcards: integridade da sessão de revisão (documento de
-- requisitos de Flashcards — confiabilidade do FSRS). Hoje gradeFlashcardAction
-- faz um update em flashcard_srs_state e um insert em review_logs como duas
-- chamadas separadas: sem transação única (uma pode falhar depois da outra
-- já ter gravado) e sem proteção contra reenvio da mesma resposta (duplo
-- clique, retry de rede). Esta migração adiciona os dois.

alter table public.review_logs
  add column idempotency_key uuid not null default gen_random_uuid(),
  add column timezone text,
  add column local_date date,
  add column response_duration_ms int;

alter table public.review_logs
  add constraint review_logs_idempotency_key_key unique (idempotency_key);

create index review_logs_local_date_idx on public.review_logs (user_id, local_date);

-- Grava a nota de um flashcard (update do estado FSRS + insert do
-- histórico) numa única transação, travando a linha do estado enquanto
-- calcula e escreve. O cálculo do FSRS em si continua em TypeScript (via
-- ts-fsrs, em lib/srs/fsrs.ts) — reescrever esse algoritmo em PL/pgSQL não
-- vale o risco; esta função só garante que ESCREVER o resultado seja
-- atômico e seguro pra reenvio.
--
-- p_expected_reps é o "reps" que o cliente leu antes de calcular o próximo
-- estado. Se não bater com o valor atual da linha travada, alguma outra
-- escrita aconteceu no meio (ex: reiniciar progresso, ou uma segunda
-- resposta pro mesmo cartão chegando primeiro) — a chamada falha em vez de
-- gravar por cima silenciosamente com um cálculo baseado em dado velho.
-- idempotency_key garante que reenviar a mesma tentativa (retry de rede)
-- nunca aplica a nota duas vezes: a checagem roda DEPOIS de travar a linha,
-- então uma segunda chamada com a mesma chave espera a primeira terminar e
-- só então enxerga o registro já gravado.
create or replace function public.grade_flashcard(
  p_flashcard_id uuid,
  p_session_id uuid,
  p_idempotency_key uuid,
  p_expected_reps int,
  p_rating smallint,
  p_state_after smallint,
  p_due_after timestamptz,
  p_stability_after double precision,
  p_difficulty_after double precision,
  p_elapsed_days_after int,
  p_scheduled_days int,
  p_learning_steps_after int,
  p_reps_after int,
  p_lapses_after int,
  p_reviewed_at timestamptz,
  p_timezone text,
  p_response_duration_ms int
)
-- Prefixo out_ nas colunas de retorno de propósito: sem ele, "state_after"
-- e "due_after" viram variáveis implícitas que colidem com as colunas de
-- mesmo nome em review_logs, e qualquer select por esses nomes vira
-- "column reference is ambiguous" (erro 42702).
returns table (
  out_log_id uuid,
  out_state_after smallint,
  out_due_after timestamptz,
  out_was_duplicate boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reps_before int;
  v_state_before smallint;
  v_due_before timestamptz;
  v_stability_before double precision;
  v_difficulty_before double precision;
  v_existing_id uuid;
  v_existing_state_after smallint;
  v_existing_due_after timestamptz;
  v_local_date date;
  v_new_log_id uuid;
begin
  if v_user_id is null then
    raise exception 'não autenticada' using errcode = '28000';
  end if;

  select reps, state, due_at, stability, difficulty
    into v_reps_before, v_state_before, v_due_before, v_stability_before, v_difficulty_before
  from public.flashcard_srs_state
  where flashcard_id = p_flashcard_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'flashcard não encontrado' using errcode = 'P0002';
  end if;

  select id, state_after, due_after into v_existing_id, v_existing_state_after, v_existing_due_after
  from public.review_logs
  where idempotency_key = p_idempotency_key and user_id = v_user_id;

  if found then
    return query select v_existing_id, v_existing_state_after, v_existing_due_after, true;
    return;
  end if;

  if v_reps_before != p_expected_reps then
    raise exception 'o estado do cartão mudou antes desta resposta ser salva' using errcode = '40001';
  end if;

  begin
    v_local_date := (p_reviewed_at at time zone coalesce(nullif(p_timezone, ''), 'UTC'))::date;
  exception when others then
    v_local_date := (p_reviewed_at at time zone 'UTC')::date;
  end;

  update public.flashcard_srs_state
  set state = p_state_after,
      due_at = p_due_after,
      stability = p_stability_after,
      difficulty = p_difficulty_after,
      elapsed_days = p_elapsed_days_after,
      scheduled_days = p_scheduled_days,
      learning_steps = p_learning_steps_after,
      reps = p_reps_after,
      lapses = p_lapses_after,
      last_review_at = p_reviewed_at,
      updated_at = now()
  where flashcard_id = p_flashcard_id and user_id = v_user_id;

  insert into public.review_logs (
    user_id, flashcard_id, session_id, idempotency_key, rating,
    state_before, state_after, due_before, due_after,
    stability_before, stability_after, difficulty_before, difficulty_after,
    scheduled_days, elapsed_days, reviewed_at,
    timezone, local_date, response_duration_ms
  ) values (
    v_user_id, p_flashcard_id, p_session_id, p_idempotency_key, p_rating,
    v_state_before, p_state_after, v_due_before, p_due_after,
    v_stability_before, p_stability_after, v_difficulty_before, p_difficulty_after,
    p_scheduled_days, p_elapsed_days_after, p_reviewed_at,
    p_timezone, v_local_date, p_response_duration_ms
  )
  returning id into v_new_log_id;

  return query select v_new_log_id, p_state_after, p_due_after, false;
end;
$$;

revoke all on function public.grade_flashcard from public;
grant execute on function public.grade_flashcard to authenticated;
