// ===== Reservas · Tenencia Dashboard =====
const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MESES_ABR = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Paleta consistente por reserva (ordenada por reserva_orden estable)
const RESERVA_COLORS = [
  "#4ade80", // verde
  "#60a5fa", // azul
  "#fbbf24", // amarillo
  "#f472b6", // rosa
  "#c084fc", // violeta
  "#22d3ee", // cian
  "#fb923c", // naranja
  "#a3e635", // lima
];

let ALL = [];
let charts = {};

const filters = { anio: [], mes: [], reserva: [], lastN: null };
const el = (id) => document.getElementById(id);

// ---------- Formateadores ----------
const fmtARS = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUSD = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v) => (v == null || !isFinite(v)) ? "–" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
function money(monto, moneda) {
  // Versión compacta para ticks de charts (K / M)
  if (monto == null || !isFinite(monto)) return "–";
  const abs = Math.abs(monto);
  const compact = abs >= 1e6
    ? (monto / 1e6).toFixed(abs >= 1e7 ? 1 : 2) + "M"
    : abs >= 1e3
      ? (monto / 1e3).toFixed(1) + "K"
      : monto.toFixed(0);
  const sym = moneda === "ARS" ? "$" : "US$";
  return `${sym} ${compact}`;
}
function moneyFull(monto, moneda) {
  // Versión completa con 2 decimales para KPIs, tooltips y tabla
  if (monto == null || !isFinite(monto)) return "–";
  const sym = moneda === "ARS" ? "$" : "US$";
  return `${sym} ${(moneda === "ARS" ? fmtARS : fmtUSD).format(monto)}`;
}

// ---------- Init ----------
async function init() {
  try {
    ALL = await window.APP_ENV.loadTable("reservas");
  } catch (e) {
    console.error("Error cargando reservas:", e);
    document.querySelector(".wrap").innerHTML =
      `<p class="empty">No se pudieron cargar los datos desde Supabase. Revisá la consola y <code>js/supabase-client.js</code>.</p>`;
    return;
  }
  buildFilterOptions();
  bindFilters();
  renderLastUpdate();
  render();
}
window.initReservas = init;

function renderLastUpdate() {
  if (!ALL.length) return;
  const last = [...ALL].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1);
  const [y, mo, d] = last.fecha.split("-");
  el("last-update").textContent = `Última carga: ${d}/${mo}/${y}`;
}

function uniqueSorted(key) {
  return [...new Set(ALL.map(m => m[key]).filter(v => v !== null && v !== undefined))]
    .sort((a, b) => String(a).localeCompare(String(b), "es", { numeric: true }));
}

function reservasOrdenadas() {
  const map = new Map();
  ALL.forEach(r => {
    if (!map.has(r.reserva)) map.set(r.reserva, r.reserva_orden ?? 999);
  });
  return [...map.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "es"))
    .map(([nombre]) => nombre);
}

function colorForReserva(nombre) {
  const list = reservasOrdenadas();
  const idx = list.indexOf(nombre);
  return RESERVA_COLORS[(idx >= 0 ? idx : 0) % RESERVA_COLORS.length];
}

function buildFilterOptions() {
  setupCombo("combo-anio", uniqueSorted("anio").map(v => [String(v), String(v)]), "anio", "Todos");
  setupCombo("combo-mes", uniqueSorted("mes").map(n => [String(n), MESES[n]]), "mes", "Todos");
  setupCombo("combo-reserva", reservasOrdenadas().map(v => [v, v]), "reserva", "Todas");
}

// ---------- Combobox ----------
const combos = {};
function setupCombo(comboId, items, filterKey, placeholder) {
  const root = el(comboId);
  const input = root.querySelector(".combo-input");
  const list = root.querySelector(".combo-list");
  combos[comboId] = { root, input, list, filterKey, placeholder, items };
  input.addEventListener("click", () => toggleCombo(comboId));
  renderComboList(comboId);
  updateComboInput(comboId);
}
function renderComboList(comboId) {
  const c = combos[comboId];
  const sel = filters[c.filterKey];
  let html = `<li class="combo-opt combo-all" data-val="__all">
      <span class="chk${sel.length === 0 ? " on" : ""}"></span>${c.placeholder}</li>`;
  html += c.items.map(([val, label]) => {
    const on = sel.includes(val);
    return `<li class="combo-opt" data-val="${String(val).replace(/"/g, "&quot;")}">
      <span class="chk${on ? " on" : ""}"></span>${label}</li>`;
  }).join("");
  if (!c.items.length) html += '<li class="combo-empty">Sin opciones</li>';
  c.list.innerHTML = html;
  c.list.querySelectorAll(".combo-opt").forEach(li => {
    li.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const val = li.getAttribute("data-val");
      if (val === "__all") filters[c.filterKey] = [];
      else {
        const arr = filters[c.filterKey];
        const i = arr.indexOf(val);
        if (i === -1) arr.push(val); else arr.splice(i, 1);
      }
      renderComboList(comboId);
      updateComboInput(comboId);
      render();
    });
  });
}
function updateComboInput(comboId) {
  const c = combos[comboId];
  const sel = filters[c.filterKey];
  if (sel.length === 0) {
    c.input.value = "";
    c.input.placeholder = c.placeholder;
  } else {
    const labels = sel.map(v => (c.items.find(([val]) => val === v) || [v, v])[1]);
    c.input.value = labels.length <= 2 ? labels.join(", ") : `${labels.length} seleccionados`;
  }
}
function toggleCombo(comboId) {
  Object.keys(combos).forEach(id => {
    if (id === comboId) combos[id].root.classList.toggle("open");
    else combos[id].root.classList.remove("open");
  });
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".combo")) {
    Object.values(combos).forEach(c => c.root.classList.remove("open"));
  }
});

function bindFilters() {
  el("reset").addEventListener("click", () => {
    Object.keys(filters).forEach(k => { filters[k] = Array.isArray(filters[k]) ? [] : null; });
    el("last-n").value = "";
    Object.keys(combos).forEach(id => { renderComboList(id); updateComboInput(id); });
    render();
  });
  el("last-n").addEventListener("input", (e) => {
    const v = parseInt(e.target.value, 10);
    filters.lastN = (isFinite(v) && v > 0) ? v : null;
    render();
  });
}

// ---------- Filtrado ----------
function applyFilters(rows) {
  let out = rows.filter(r => {
    if (filters.anio.length    && !filters.anio.includes(String(r.anio))) return false;
    if (filters.mes.length     && !filters.mes.includes(String(r.mes))) return false;
    if (filters.reserva.length && !filters.reserva.includes(r.reserva)) return false;
    return true;
  });
  return out;
}

// ---------- Series mensuales con carry-forward ----------
// Devuelve: { periodos: ["2025-01",...], series: { [reserva]: { ARS:[...], USD:[...] } }, totals: { ARS:[...], USD:[...] } }
function buildTimeSeries(rows) {
  if (!rows.length) return { periodos: [], series: {}, totals: { ARS: [], USD: [] } };

  // 1) período por fila (YYYY-MM)
  const perKey = (r) => `${r.anio}-${String(r.mes).padStart(2, "0")}`;

  // 2) todos los períodos ordenados (rellenamos huecos)
  const setP = new Set(rows.map(perKey));
  const arrP = [...setP].sort();
  const [minY, minM] = arrP[0].split("-").map(Number);
  const [maxY, maxM] = arrP.at(-1).split("-").map(Number);
  const periodos = [];
  let y = minY, m = minM;
  while (y < maxY || (y === maxY && m <= maxM)) {
    periodos.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }

  // 3) Últimos N períodos (filtro global)
  const periodosVis = filters.lastN ? periodos.slice(-filters.lastN) : periodos;

  // 4) Reservas presentes (después de filtro)
  const reservas = reservasOrdenadas().filter(r =>
    !filters.reserva.length || filters.reserva.includes(r)
  );

  // 5) Índice: row por (reserva, moneda, periodo)
  const map = new Map();
  rows.forEach(r => {
    const k = `${r.reserva}||${r.moneda}||${perKey(r)}`;
    map.set(k, Number(r.monto) || 0);
  });

  // 6) Series con carry-forward. Usamos TODOS los períodos para carry-forward,
  //    pero exponemos solo los visibles.
  const series = {};
  const totals = { ARS: [], USD: [] };

  for (const res of reservas) series[res] = { ARS: [], USD: [] };

  ["ARS", "USD"].forEach(mon => {
    // carry-forward por reserva
    const last = new Map(reservas.map(r => [r, null]));
    // recorrer TODO el rango, luego proyectar los visibles
    const fullValues = new Map(reservas.map(r => [r, []]));
    for (const p of periodos) {
      for (const res of reservas) {
        const k = `${res}||${mon}||${p}`;
        if (map.has(k)) last.set(res, map.get(k));
        fullValues.get(res).push(last.get(res)); // puede ser null si nunca hubo
      }
    }
    // proyectar visibles
    const startIdx = periodos.length - periodosVis.length;
    for (const res of reservas) {
      series[res][mon] = fullValues.get(res).slice(startIdx).map(v => v == null ? 0 : v);
    }
    // totales por período visible
    totals[mon] = periodosVis.map((_, i) => {
      let sum = 0;
      for (const res of reservas) sum += series[res][mon][i] || 0;
      return sum;
    });
  });

  return { periodos: periodosVis, series, totals, reservas };
}

function labelPeriodo(p) {
  const [y, m] = p.split("-").map(Number);
  return `${MESES_ABR[m]} '${String(y).slice(-2)}`;
}

// ---------- KPIs ----------
function computeKPIs(ts) {
  const out = { ARS: {}, USD: {} };
  ["ARS", "USD"].forEach(mon => {
    const t = ts.totals[mon];
    const n = t.length;
    const actual = n ? t[n - 1] : 0;
    const prev   = n >= 2 ? t[n - 2] : null;
    const varMes = (prev != null && prev > 0) ? ((actual - prev) / prev) * 100 : null;
    // Variación año: comparar contra 12 meses atrás si existe
    const prevY  = n >= 13 ? t[n - 13] : null;
    const varAnio = (prevY != null && prevY > 0) ? ((actual - prevY) / prevY) * 100 : null;
    const maxVal = n ? Math.max(...t) : 0;
    const maxIdx = t.indexOf(maxVal);
    const maxPer = maxIdx >= 0 ? ts.periodos[maxIdx] : null;
    // meses con carga: períodos donde hubo al menos un registro directo (no carry)
    const mesesCarga = new Set();
    // (usamos ts.reservas para chequear que hubo cambios; simplificamos: contamos períodos con total > 0)
    t.forEach((v, i) => { if (v > 0) mesesCarga.add(ts.periodos[i]); });
    out[mon] = { actual, prev, varMes, varAnio, maxVal, maxPer, mesesCarga: mesesCarga.size };
  });
  return out;
}

function renderKPIs(kpis, ts) {
  ["ARS", "USD"].forEach(mon => {
    const k = kpis[mon];
    const pref = mon.toLowerCase();
    el(`kpi-${pref}-total`).innerHTML = moneyFull(k.actual, mon);
    el(`kpi-${pref}-total-sub`).textContent = ts.periodos.length
      ? `al ${labelPeriodo(ts.periodos.at(-1))}` : "";

    // Variación mes
    const vmEl = el(`kpi-${pref}-var-mes`);
    const vmCard = el(`kpi-card-${pref}-var-mes`);
    vmEl.textContent = fmtPct(k.varMes);
    vmCard.classList.toggle("up", k.varMes != null && k.varMes >= 0);
    vmCard.classList.toggle("down", k.varMes != null && k.varMes < 0);
    el(`kpi-${pref}-var-mes-sub`).textContent = k.prev != null
      ? `vs ${moneyFull(k.prev, mon)}` : "sin período previo";

    // Variación año
    const vaEl = el(`kpi-${pref}-var-anio`);
    const vaCard = el(`kpi-card-${pref}-var-anio`);
    vaEl.textContent = fmtPct(k.varAnio);
    vaCard.classList.toggle("up", k.varAnio != null && k.varAnio >= 0);
    vaCard.classList.toggle("down", k.varAnio != null && k.varAnio < 0);
    el(`kpi-${pref}-var-anio-sub`).textContent = k.varAnio != null
      ? "vs mismo mes año pasado" : "sin dato hace 12 meses";

    // Máximo
    el(`kpi-${pref}-max`).innerHTML = moneyFull(k.maxVal, mon);
    el(`kpi-${pref}-max-sub`).textContent = k.maxPer ? labelPeriodo(k.maxPer) : "";

    // Meses con carga
    el(`kpi-${pref}-meses`).textContent = String(k.mesesCarga);
    el(`kpi-${pref}-meses-sub`).textContent = ts.periodos.length
      ? `sobre ${ts.periodos.length} en el rango` : "";
  });

  // Record badge (header)
  const arsAct = kpis.ARS.actual;
  const usdAct = kpis.USD.actual;
  el("record").innerHTML = `
    <span class="ars">${moneyFull(arsAct, "ARS")}</span>
    <span class="sep">·</span>
    <span class="usd">${moneyFull(usdAct, "USD")}</span>`;
}

// ---------- Charts ----------
const chartDefaults = {
  color: "#e6edf3",
  font: { family: '"Inter", sans-serif', size: 12 }
};
function commonScales(mon) {
  const color = mon === "ARS" ? "#fbbf24" : "#4ade80";
  return {
    x: {
      ticks: { color: "#8b949e" },
      grid: { color: "rgba(255,255,255,0.04)" }
    },
    y: {
      ticks: {
        color: "#8b949e",
        callback: (v) => money(v, mon)
      },
      grid: { color: "rgba(255,255,255,0.06)" }
    }
  };
}
function destroyChart(key) { if (charts[key]) { charts[key].destroy(); charts[key] = null; } }

function renderLineChart(canvasId, key, mon, ts) {
  destroyChart(key);
  const ctx = el(canvasId);
  const color = mon === "ARS" ? "#fbbf24" : "#4ade80";
  charts[key] = new Chart(ctx, {
    type: "line",
    data: {
      labels: ts.periodos.map(labelPeriodo),
      datasets: [{
        label: `Tenencia ${mon}`,
        data: ts.totals[mon],
        borderColor: color,
        backgroundColor: color + "22",
        pointBackgroundColor: color,
        pointRadius: 3,
        tension: 0.25,
        fill: true,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${moneyFull(ctx.parsed.y, mon)}`
          }
        }
      },
      scales: commonScales(mon)
    }
  });
}

function renderDonut(canvasId, key, mon, ts) {
  destroyChart(key);
  const ctx = el(canvasId);
  const reservas = ts.reservas || [];
  const lastIdx = ts.periodos.length - 1;
  const values = reservas.map(r => (ts.series[r]?.[mon]?.[lastIdx]) || 0);
  const total = values.reduce((a, b) => a + b, 0);
  const colors = reservas.map(colorForReserva);
  const hasData = total > 0;

  charts[key] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: reservas,
      datasets: [{
        data: hasData ? values : [1],
        backgroundColor: hasData ? colors : ["#2a313c"],
        borderColor: "#161b22",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#e6edf3", font: chartDefaults.font, boxWidth: 12, padding: 10 }
        },
        tooltip: {
          enabled: hasData,
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed;
              const p = total > 0 ? (v / total * 100).toFixed(1) : "0";
              return `${ctx.label}: ${moneyFull(v, mon)} (${p}%)`;
            }
          }
        }
      }
    }
  });
}

function renderStackedBar(canvasId, key, mon, ts) {
  destroyChart(key);
  const ctx = el(canvasId);
  const reservas = ts.reservas || [];
  const datasets = reservas.map(r => ({
    label: r,
    data: ts.series[r]?.[mon] || [],
    backgroundColor: colorForReserva(r),
    borderColor: colorForReserva(r),
    borderWidth: 0,
    stack: "stack1"
  }));

  charts[key] = new Chart(ctx, {
    type: "bar",
    data: { labels: ts.periodos.map(labelPeriodo), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#e6edf3", font: chartDefaults.font, boxWidth: 12, padding: 10 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${moneyFull(ctx.parsed.y, mon)}`,
            footer: (items) => {
              const sum = items.reduce((s, i) => s + i.parsed.y, 0);
              return `Total: ${moneyFull(sum, mon)}`;
            }
          }
        }
      },
      scales: {
        x: { stacked: true, ticks: { color: "#8b949e" }, grid: { color: "rgba(255,255,255,0.04)" } },
        y: { stacked: true, ticks: { color: "#8b949e", callback: (v) => money(v, mon) }, grid: { color: "rgba(255,255,255,0.06)" } }
      }
    }
  });
}

// ---------- Tabla ----------
function renderTable(rows) {
  const body = el("tabla-body");
  el("tabla-count").textContent = rows.length ? `(${rows.length})` : "";
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="6" class="empty">Sin registros para los filtros aplicados.</td></tr>`;
    return;
  }
  const sorted = [...rows].sort((a, b) =>
    b.fecha.localeCompare(a.fecha) || (b.id - a.id)
  );
  body.innerHTML = sorted.map((r, i) => {
    const [y, mo, d] = r.fecha.split("-");
    const monClass = r.moneda === "ARS" ? "b-ars" : "b-usd";
    return `<tr data-id="${r.id}">
      <td class="c-num">${sorted.length - i}</td>
      <td>${d}/${mo}/${y}</td>
      <td><span class="badge b-reserva">${r.reserva}</span></td>
      <td><span class="badge ${monClass}">${r.moneda}</span></td>
      <td class="c-right">${moneyFull(r.monto, r.moneda)}</td>
      <td class="c-nota" title="${escapeAttr(r.nota || "")}">${r.nota || ""}</td>
    </tr>`;
  }).join("");

  // Click en fila → edit (solo admin)
  if (document.body.classList.contains("is-admin") && typeof window.openEditReserva === "function") {
    body.querySelectorAll("tr[data-id]").forEach(tr => {
      tr.addEventListener("click", () => {
        const id = Number(tr.getAttribute("data-id"));
        const row = ALL.find(x => x.id === id);
        if (row) window.openEditReserva(row);
      });
    });
  }
}
function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------- Render principal ----------
function render() {
  const filtered = applyFilters(ALL);
  const ts = buildTimeSeries(filtered);
  const kpis = computeKPIs(ts);
  renderKPIs(kpis, ts);
  renderLineChart("chart-line-ars", "lineArs", "ARS", ts);
  renderLineChart("chart-line-usd", "lineUsd", "USD", ts);
  renderDonut("chart-donut-ars", "donutArs", "ARS", ts);
  renderDonut("chart-donut-usd", "donutUsd", "USD", ts);
  renderStackedBar("chart-stack-ars", "stackArs", "ARS", ts);
  renderStackedBar("chart-stack-usd", "stackUsd", "USD", ts);
  renderTable(filtered);
}

// Exponemos para que admin.js recargue tras un CRUD
window.reloadReservas = async function () {
  try {
    ALL = await window.APP_ENV.loadTable("reservas");
    buildFilterOptions();
    renderLastUpdate();
    render();
  } catch (e) { console.error(e); }
};

// Auto-init
document.addEventListener("DOMContentLoaded", init);