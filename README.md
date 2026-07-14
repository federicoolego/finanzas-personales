# Reservas · Tenencia en el tiempo

Dashboard personal para registrar y visualizar la tenencia de mis reservas financieras a lo largo del tiempo, en **ARS** y **USD**.

Reservas por defecto: `Ahorro`, `Vacaciones`, `Fondo Emergencia`, `Portafolio Jubilación`.
El catálogo es editable desde la app (modo admin).

Basado en la misma arquitectura y estilo que Estadisticas-Padel — dark theme GitHub-style, combos multi-selección, Chart.js.

## Estructura

```
Reservas-Tenencia/
├── index.html
├── css/
│   ├── styles.css       # dashboard
│   └── admin.css        # modales admin + topbar
├── js/
│   ├── env.js           # loader de la view reservas_view
│   ├── supabase-client.js
│   ├── reservas.js      # dashboard (KPIs, charts, tabla)
│   └── admin.js         # auth + CRUD + catálogo
└── sql/
    └── schema.sql       # esquema Supabase (correr una vez)
```

## Modelo de datos

Cada carga es un **snapshot mensual**: el saldo total de una reserva en una moneda al cierre del mes.

Tabla `reservas`:

| campo        | tipo         | notas |
|--------------|--------------|-------|
| id           | bigserial    | PK |
| fecha        | date         | fin de mes (o cualquier día del mes) |
| anio         | int          | generated from fecha |
| mes          | int          | generated from fecha |
| reserva_id   | fk           | → `reservas_catalogo` |
| moneda       | text         | `'ARS'` \| `'USD'` |
| monto        | numeric      | saldo total de esa reserva a esa fecha |
| nota         | text         | opcional |

**Constraint clave:** `unique (reserva_id, moneda, anio, mes)` — una sola fila por combinación. Si volvés a cargar el mismo mes, se hace upsert (actualiza la existente).

## Setup

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Corré todo el contenido de `sql/schema.sql` en el SQL Editor.
3. Copiá `Project URL` y `anon public key` desde *Settings → API*.
4. Editá `js/supabase-client.js` con esos valores.
5. En *Authentication → Users*, creá tu usuario admin (email + password).
6. Servís los archivos y login desde el botón `🔒 Admin`:

```bash
python -m http.server 8000
# http://localhost:8000
```

Sin login sólo se ve el dashboard (lectura). Con sesión activa aparecen los botones de edición.

Si querés bloquear la lectura pública también, en `sql/schema.sql` cambiá los policies de SELECT para usar `(auth.role() = 'authenticated')` en vez de `true`.

## KPIs

Por moneda (ARS y USD):

- **Tenencia actual** — suma de última carga de cada reserva.
- **Variación mes** — vs mes anterior.
- **Variación año** — vs mismo mes hace 12 meses.
- **Máximo histórico** — pico + mes en que ocurrió.
- **Meses con carga** — cuántos meses del rango tienen datos.

## Charts

- Evolución tenencia total ARS / USD (línea, carry-forward mensual).
- Composición actual por reserva ARS / USD (dona).
- Evolución stackeada por reserva ARS / USD (barras apiladas).

Los períodos sin carga toman el último valor conocido (carry-forward), así que no ves huecos si un mes no cargaste.

## Filtros

- Año, Mes, Reserva (multi-selección).
- Últimos N meses (input numérico).
- Botón "Limpiar filtros".

## Modo admin

Con sesión Supabase activa:

- Botón `➕ Nueva carga` en el header — abre form con **upsert** por (reserva, moneda, año-mes).
- Click en cualquier fila de la tabla → editar / eliminar.
- Menú admin → `⚙️ Reservas` → gestionar el catálogo (agregar, renombrar, borrar).

---

Equipo de Automatización · FYO
