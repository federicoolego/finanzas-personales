# Mis recibos de sueldo

App personal para cargar, editar y analizar el historial de recibos de sueldo: resumen con KPIs y gráficos, lista editable y exportación a CSV.

**Stack:** React + Vite + TypeScript, Recharts, Supabase (Postgres + Auth con RLS).

## Puesta en marcha

### 1. Supabase
1. Creá un proyecto (o usá uno existente).
2. **Authentication → Users → Add user**: creá tu usuario con email y contraseña.
   Después, en **Authentication → Sign In / Providers**, desactivá *Allow new users to sign up* para que nadie más pueda registrarse.
3. **SQL Editor**: pegá y corré `supabase/schema.sql` (crea la tabla `payslips`, columnas calculadas, trigger y políticas RLS).
4. Pegá `supabase/seed.sql`, cambiá el email de la línea `v_email` por el de tu usuario y corrélo. Importa los 68 recibos de marzo 2021 a octubre 2026.
5. **Project Settings → API**: copiá la *Project URL* y la clave *anon public*.

### 2. Local
```bash
cp .env.example .env     # completá URL y anon key
npm install
npm run dev
```

### 3. Deploy
- **Vercel / Netlify:** importá el repo, agregá las dos variables `VITE_SUPABASE_*` y listo (build `npm run build`, salida `dist`).
- **GitHub Pages:** ya viene `.github/workflows/deploy.yml`. Activá *Settings → Pages → Source: GitHub Actions* y cargá los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Seguridad
Los datos están protegidos por Row Level Security: sin sesión, la API devuelve cero filas. La anon key es pública por diseño; lo que protege tus datos son las políticas y el login. Dejá el registro de usuarios desactivado.

## Modelo de datos
| Campo | Descripción |
|---|---|
| `year`, `month` | Período (único por usuario) |
| `gross`, `net` | Bruto y neto en ARS |
| `ganancias` | Negativo = retenido, positivo = devolución |
| `fx_rate` | Pesos por dólar usado ese mes |
| `net_gross_pct`, `ganancias_pct`, `net_usd`, `gross_usd` | Calculadas por Postgres |

## Qué muestra el resumen
Neto en USD con promedio móvil de 6 meses, bruto vs neto (USD o ARS), neto/bruto, Ganancias mes a mes, tipo de cambio, promedio anual, comparativa año contra año y un mapa de calor año × mes. KPIs: variación vs mes anterior e interanual (pesos y dólares), mediana y promedio de 12 meses, acumulado del año, mejor y peor mes, total cobrado.
