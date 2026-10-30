-- =====================================================================
-- Mis Aumentos — tabla de ajustes de sueldo bruto base
-- Correr en Supabase > SQL Editor. Idempotente.
-- Los cálculos (aumento $, % aumento, % interanual, diferencia vs IPC)
-- los hace la app a partir de estos datos, no se guardan.
-- =====================================================================

create table if not exists public.salary_raises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,

  year        smallint      not null check (year between 2000 and 2100),
  month       smallint      not null check (month between 1 and 12),
  salary      numeric(16,2) not null check (salary > 0),      -- Sueldo bruto base desde ese mes
  ipc_yoy     numeric(8,2),                                   -- IPC interanual (%) de ese mes; null si todavía no se publicó
  notes       text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint salary_raises_user_period_uniq unique (user_id, year, month)
);

create index if not exists salary_raises_user_period_idx
  on public.salary_raises (user_id, year, month);

-- reutiliza set_updated_at() creada en schema.sql
drop trigger if exists salary_raises_set_updated_at on public.salary_raises;
create trigger salary_raises_set_updated_at
  before update on public.salary_raises
  for each row execute function public.set_updated_at();

alter table public.salary_raises enable row level security;

drop policy if exists "raises_select_own" on public.salary_raises;
drop policy if exists "raises_insert_own" on public.salary_raises;
drop policy if exists "raises_update_own" on public.salary_raises;
drop policy if exists "raises_delete_own" on public.salary_raises;

create policy "raises_select_own" on public.salary_raises
  for select to authenticated using (auth.uid() = user_id);
create policy "raises_insert_own" on public.salary_raises
  for insert to authenticated with check (auth.uid() = user_id);
create policy "raises_update_own" on public.salary_raises
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "raises_delete_own" on public.salary_raises
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.salary_raises from anon;
grant select, insert, update, delete on public.salary_raises to authenticated;
