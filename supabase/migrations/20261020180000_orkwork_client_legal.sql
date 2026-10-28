-- OR-K WORK — company / tax details for clients (Colombia: NIT + RUT).

alter table public.clients
  add column if not exists legal jsonb not null default '{}',
  add column if not exists rut_path text;
