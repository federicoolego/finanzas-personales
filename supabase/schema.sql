-- =====================================================================
-- Recibos de sueldo — esquema para Supabase
-- Correr completo en: Supabase > SQL Editor > New query > Run
-- Es idempotente: se puede volver a correr sin romper nada.
-- =====================================================================

create table if not exists public.payslips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,

  year        smallint      not null check (year between 2000 and 2100),
  month       smallint      not null check (month between 1 and 12),

  gross       numeric(16,2) not null check (gross >= 0),        -- Bruto (ARS)
  net         numeric(16,2) not null check (net >= 0),          -- Neto (ARS)
  ganancias   numeric(16,2) not null default 0,                 -- Negativo = retenido, positivo = devolución
  fx_rate     numeric(12,4) not null check (fx_rate > 0),       -- Tipo de cambio ARS por USD
  notes       text,

  -- Columnas derivadas (se recalculan solas al insertar / editar)
  net_gross_pct  numeric(8,2)  generated always as (round(net / nullif(gross, 0) * 100, 2)) stored,
  ganancias_pct  numeric(8,2)  generated always as (round(ganancias / nullif(gross, 0) * 100, 2)) stored,
  net_usd        numeric(14,2) generated always as (round(net / fx_rate, 2)) stored,
  gross_usd      numeric(14,2) generated always as (round(gross / fx_rate, 2)) stored,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint payslips_user_period_uniq unique (user_id, year, month)
);

create index if not exists payslips_user_period_idx
  on public.payslips (user_id, year, month);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists payslips_set_updated_at on public.payslips;
create trigger payslips_set_updated_at
  before update on public.payslips
  for each row execute function public.set_updated_at();

-- Row Level Security: cada usuario ve y toca solamente lo suyo
alter table public.payslips enable row level security;

drop policy if exists "payslips_select_own" on public.payslips;
drop policy if exists "payslips_insert_own" on public.payslips;
drop policy if exists "payslips_update_own" on public.payslips;
drop policy if exists "payslips_delete_own" on public.payslips;

create policy "payslips_select_own" on public.payslips
  for select to authenticated using (auth.uid() = user_id);
create policy "payslips_insert_own" on public.payslips
  for insert to authenticated with check (auth.uid() = user_id);
create policy "payslips_update_own" on public.payslips
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "payslips_delete_own" on public.payslips
  for delete to authenticated using (auth.uid() = user_id);

-- El rol anónimo no tiene acceso a la tabla
revoke all on public.payslips from anon;
grant select, insert, update, delete on public.payslips to authenticated;
