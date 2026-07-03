# Finanzas Familiar

App web (sin backend, todo en el navegador con `localStorage`) para controlar mes a mes
los **ingresos**, los **gastos** y la **plata disponible** de la familia.

El foco NO es marcar qué se pagó, sino los **KPIs de montos y porcentajes disponibles** del mes.

## Pantallas

- **Mes Actual** (pantalla inicial): KPIs del mes elegido — *Ingresos del mes*, *Gastos del mes*
  y *Disponible*. Gastos y Disponible se muestran también como **% de los ingresos totales**.
  Incluye una barra de consumo del ingreso y el detalle de gastos por categoría.
- **Dashboard**: KPIs y gráficos de Ingresos vs Gastos, gastos por categoría,
  Gastos vs Disponible (con %) y disponible mensual a lo largo del año.
- **Ingresos** (ABM): alta/baja/edición de ingresos. Columnas *Descripción* y *Tipo*
  (Sueldo / Honorarios / Otros), ambas obligatorias. Se cargan los montos de los 12 meses del año.
- **Gastos** (ABM): alta/baja/edición de gastos. Columnas *Descripción* y *Categoría*
  (Servicio, Educación, Salud, Deportes, Impuestos, Seguros, Hogar, Transporte, Otros),
  ambas obligatorias. Se cargan los montos de los 12 meses del año.

## Cálculos

Para un mes y año dados:

- **Ingresos del mes** = suma de todos los ingresos de ese mes.
- **Gastos del mes** = suma de todos los gastos de ese mes.
- **Disponible** = Ingresos − Gastos.
- **% Gastos** = Gastos / Ingresos.
- **% Disponible** = Disponible / Ingresos.

## Uso

Abrir `index.html` en el navegador. Los datos se guardan en `localStorage`.
Botones *Exportar* / *Importar* para respaldar o mover los datos como JSON.

## Estructura

```
index.html
css/styles.css
js/
  seed.js            datos iniciales (gastos e ingresos base)
  store.js           estado + persistencia + agregados (KPIs)
  utils.js           helpers (formato ARS, creación de nodos, toast)
  views/
    mes.js           vista "Mes Actual"
    dashboard.js     vista "Dashboard"
    ingresos.js      ABM de ingresos
    abm.js           ABM de gastos
  app.js             navegación e import/export
```
