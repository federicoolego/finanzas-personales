-- =====================================================================
-- Reservas · Tenencia en el tiempo · Esquema Supabase
-- =====================================================================
-- Correr todo este script en el SQL editor de Supabase.
-- Estructura:
--   · reservas_catalogo  → catálogo normalizado de buckets (Ahorro, etc.)
--   · reservas           → snapshots mensuales de tenencia por bucket+moneda
--   · reservas_view      → view aplanada (con reserva como string) que consume el front
--   · reservas_catalogo_con_uso → view con contador para el panel de catálogos
--
-- Convención de fechas: cada fila representa el saldo a fin de mes.
-- Podés cargar cualquier día del mes, la app agrupa por (año, mes).
-- =====================================================================

-- ---------- 1) Catálogo de reservas ----------
create table if not exists public.reservas_catalogo (
  id     bigserial primary key,
  nombre text        not null unique,
  orden  int         not null default 100,
  created_at timestamptz not null default now()
);

-- Seed inicial (idempotente)
insert into public.reservas_catalogo (nombre, orden) values
  ('Ahorro',                 10),
  ('Vacaciones',             20),
  ('Fondo Emergencia',       30),
  ('Portafolio Jubilación',  40)
on conflict (nombre) do nothing;

-- ---------- 2) Snapshots ----------
create table if not exists public.reservas (
  id           bigserial primary key,
  fecha        date        not null,
  anio         int         generated always as (extract(year  from fecha)::int) stored,
  mes          int         generated always as (extract(month from fecha)::int) stored,
  reserva_id   bigint      not null references public.reservas_catalogo(id) on delete restrict,
  moneda       text        not null check (moneda in ('ARS','USD')),
  monto        numeric(18,2) not null check (monto >= 0),
  nota         text,
  created_at   timestamptz not null default now(),
  -- una sola fila por (reserva, moneda, año, mes): si volvés a cargar el mismo mes, editás la existente
  unique (reserva_id, moneda, anio, mes)
);

create index if not exists reservas_fecha_idx    on public.reservas (fecha);
create index if not exists reservas_reserva_idx  on public.reservas (reserva_id);

-- ---------- 3) View aplanada que consume el front ----------
create or replace view public.reservas_view as
select
  r.id,
  r.fecha,
  r.anio,
  r.mes,
  c.nombre as reserva,
  c.orden  as reserva_orden,
  r.moneda,
  r.monto,
  r.nota
from public.reservas r
join public.reservas_catalogo c on c.id = r.reserva_id;

-- ---------- 4) View del catálogo con contador de uso (para gestión) ----------
create or replace view public.reservas_catalogo_con_uso as
select
  c.id,
  c.nombre,
  c.orden,
  coalesce(u.uso, 0) as uso
from public.reservas_catalogo c
left join (
  select reserva_id, count(*) as uso
  from public.reservas
  group by reserva_id
) u on u.reserva_id = c.id
order by c.orden, c.nombre;

-- =====================================================================
-- Row Level Security
-- =====================================================================
-- Lectura pública (para que el dashboard funcione sin login)
-- Escritura solo usuarios autenticados (los que crees en Auth de Supabase)

alter table public.reservas            enable row level security;
alter table public.reservas_catalogo   enable row level security;

-- Reservas: SELECT libre, INSERT/UPDATE/DELETE solo autenticado
drop policy if exists "reservas_select_all"  on public.reservas;
drop policy if exists "reservas_write_auth"  on public.reservas;
create policy "reservas_select_all" on public.reservas
  for select using (true);
create policy "reservas_write_auth" on public.reservas
  for all to authenticated using (true) with check (true);

-- Catálogo: SELECT libre, escritura solo autenticado
drop policy if exists "reservas_cat_select_all" on public.reservas_catalogo;
drop policy if exists "reservas_cat_write_auth" on public.reservas_catalogo;
create policy "reservas_cat_select_all" on public.reservas_catalogo
  for select using (true);
create policy "reservas_cat_write_auth" on public.reservas_catalogo
  for all to authenticated using (true) with check (true);

-- Nota: si querés bloquear también la lectura pública (100% privado),
-- cambiá los policies de SELECT para usar (auth.role() = 'authenticated').
