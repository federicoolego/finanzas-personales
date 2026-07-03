# Gastos Fijos

App web liviana para registrar y controlar los **gastos fijos del mes**: ABM de gastos, grilla de pagos (qué está pago / qué falta), y un dashboard con KPIs y gráficos filtrables por gasto, año y mes.

Sin frameworks ni build: es **HTML + CSS + JavaScript puro**. Se abre directo en el navegador y persiste todo en `localStorage`.

## Características

- **Dashboard** — KPIs (total del período, pagado, falta pagar, promedio mensual) y 4 gráficos (evolución mensual, distribución por categoría, pagado vs. falta, top gastos). Filtros por **Gasto**, **Año** y **Mes**.
- **Pagos del mes** — grilla del mes elegido con toggle de pago por concepto, badges de estado y totales pagado/pendiente.
- **Gastos (ABM)** — alta, edición y baja de gastos fijos, con montos mensuales por año y categoría (Gastos Fijos / Tarjetas de Crédito).
- **Import / Export** — respaldo y restauración de todos los datos en un archivo JSON.
- Datos iniciales **pre-cargados desde la hoja `2026`** del Excel original.

## Uso

No requiere instalación. Cloná el repo y abrí `index.html`:

```bash
git clone <tu-repo>.git
cd gastos-fijos
# opción A: abrir index.html directamente en el navegador
# opción B: servidor local (recomendado)
python3 -m http.server 8000
# luego visitar http://localhost:8000
```

> Los datos se guardan en el navegador (`localStorage`). Para pasarlos a otra máquina usá **Exportar** / **Importar**.

## Estructura

```
gastos-fijos/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── seed.js            # datos iniciales (hoja 2026)
    ├── store.js           # estado + persistencia localStorage
    ├── utils.js           # helpers (formato ARS, DOM, toast)
    ├── app.js             # navegación e import/export
    └── views/
        ├── dashboard.js
        ├── pagos.js
        └── abm.js
```

## Modelo de datos

```js
gasto = {
  id, banco, nombre, categoria,
  byAnio: { 2026: { montos: [12 números], pagos: [12 booleanos] } }
}
```

Cada gasto guarda montos y estado de pago por mes y por año, así podés navegar histórico y cargar años nuevos sin perder lo anterior.

## Tecnología

- HTML5 / CSS3 / JavaScript (ES6, sin dependencias de build)
- [Chart.js](https://www.chartjs.org/) vía CDN para los gráficos

---

Formato de moneda y fechas en configuración regional **es-AR**.
