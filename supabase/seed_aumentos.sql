-- =====================================================================
-- Carga del historial de aumentos (marzo 2021 a octubre 2026, 21 filas)
-- Correr DESPUÉS de schema_aumentos.sql. Cambiá el email por el de tu usuario.
-- Re-ejecutable: si el período ya existe, lo actualiza.
-- Columnas: año, mes, sueldo bruto base, IPC interanual (null = sin dato)
-- =====================================================================

do $$
declare
  v_email text := 'tu-email@ejemplo.com';   -- <<< CAMBIAR
  v_user  uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No existe un usuario con el email %. Crealo primero en Authentication > Users.', v_email;
  end if;

  insert into public.salary_raises (user_id, year, month, salary, ipc_yoy)
  select v_user, t.year, t.month, t.salary, t.ipc_yoy
  from (values
    (2021, 3, 140000, null),
    (2021, 6, 161000, null),
    (2021, 10, 210000, null),
    (2022, 1, 270000, null),
    (2022, 3, 340200, 51.10),
    (2022, 7, 401436, 71.00),
    (2022, 10, 530000, 88.00),
    (2023, 3, 768500, 104.30),
    (2023, 7, 968310, 113.50),
    (2023, 10, 1350000, 142.70),
    (2023, 12, 1620000, 211.14),
    (2024, 1, 2073604.79, 254.30),
    (2024, 2, 2488326, 276.20),
    (2024, 3, 2811808, 287.90),
    (2024, 5, 3233580.10, 276.40),
    (2024, 7, 3492266.78, 263.50),
    (2024, 10, 4051029, 193.00),
    (2025, 3, 4577663.90, 55.9),
    (2025, 10, 5218537, 31.3),
    (2026, 3, 6039934.72, 32.60),
    (2026, 10, 6885526, null)
  ) as t(year, month, salary, ipc_yoy)
  on conflict (user_id, year, month) do update
    set salary = excluded.salary,
        ipc_yoy = excluded.ipc_yoy;
end $$;
