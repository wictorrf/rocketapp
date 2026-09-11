-- Rocket — Ajustes Study Time: protege o registro manual de sessão de
-- estudo (lib/actions/study-sessions.ts) contra duplicidade em duplo
-- clique/retry de rede. Coluna opcional — null não conflita com null numa
-- constraint unique do Postgres, então o cronômetro ao vivo (que não usa
-- essa coluna) não é afetado.

alter table public.focus_sessions add column idempotency_key uuid unique;
