// Vista Dashboard: KPIs y gráficos de ingresos, gastos y disponible.

const ViewDashboard = (() => {
  let anio = new Date().getFullYear();
  let mes = "Todos";          // "Todos" o 0-11
  const charts = [];

  function destroyCharts() {
    while (charts.length) { const c = charts.pop(); c.destroy(); }
  }

  function render(container) {
    destroyCharts();
    const anios = Store.aniosDisponibles();
    if (!anios.includes(anio)) anio = anios[0];

    const mesesOpts = ["Todos", ...Store.MESES];

    const filters = el("div", { class: "filters" }, [
      anioFilter(anios, anio, (v) => { anio = Number(v); render(container); }),
      filterSelect("Mes", mesesOpts, mes === "Todos" ? "Todos" : Store.MESES[mes],
        (v) => { mes = v === "Todos" ? "Todos" : Store.MESES.indexOf(v); render(container); })
    ]);

    const stats = computeStats();

    const kpis = el("div", { class: "kpi-grid" }, [
      kpi("Ingresos", fmtARS(stats.ingresos),
        mes === "Todos" ? `Año ${anio}` : `${Store.MESES[mes]} ${anio}`, "info"),
      kpi("Gastos", fmtARS(stats.gastos),
        stats.ingresos > 0 ? `${stats.pctGastos}% de ingresos` : "—",
        stats.gastos > stats.ingresos && stats.ingresos > 0 ? "danger" : "warn"),
      kpi("Disponible", fmtARS(stats.disponible),
        stats.ingresos > 0 ? `${stats.pctDisp}% de ingresos` : "—",
        stats.disponible < 0 ? "danger" : ""),
      kpi("Promedio disp. mensual", fmtARS(stats.promDispMensual),
        mes === "Todos" ? "meses con datos" : "en el mes", "")
    ]);

    const cEvolucion = el("canvas");
    const cCategoria = el("canvas");
    const cBalance = el("canvas");
    const cDispMes = el("canvas");

    const periodo = mes === "Todos" ? `${anio}` : `${Store.MESES[mes]} ${anio}`;

    const chartGrid = el("div", { class: "chart-grid" }, [
      el("div", { class: "chart-card full" }, [
        el("h3", {}, mes === "Todos"
          ? `Ingresos vs Gastos — ${anio}`
          : `Ingresos vs Gastos — ${Store.MESES[mes]} ${anio}`),
        el("div", { class: "chart-wrap" }, cEvolucion)
      ]),
      el("div", { class: "chart-card" }, [
        el("h3", {}, `Gastos por categoría — ${periodo}`),
        el("div", { class: "chart-wrap" }, cCategoria)
      ]),
      el("div", { class: "chart-card" }, [
        el("h3", {}, `Gastos vs Disponible — ${periodo}`),
        el("div", { class: "chart-wrap" }, cBalance)
      ]),
      el("div", { class: "chart-card full" }, [
        el("h3", {}, `Disponible mensual — ${anio}`),
        el("div", { class: "chart-wrap" }, cDispMes)
      ])
    ]);

    const head = el("div", { class: "view-head" }, [el("h2", {}, "Dashboard")]);
    container.replaceChildren(head, filters, kpis, chartGrid);

    requestAnimationFrame(() => {
      buildEvolucion(cEvolucion);
      buildCategoria(cCategoria);
      buildBalance(cBalance, stats);
      buildDispMensual(cDispMes);
    });
  }

  function computeStats() {
    const rango = mes === "Todos" ? [...Array(12).keys()] : [mes];
    let ingresos = 0, gastos = 0;
    const mesesConDatos = new Set();
    rango.forEach(i => {
      const ing = Store.totalIngresosMes(anio, i);
      const gas = Store.totalGastosMes(anio, i);
      ingresos += ing; gastos += gas;
      if (ing > 0 || gas > 0) mesesConDatos.add(i);
    });
    const disponible = ingresos - gastos;
    const nMeses = mes === "Todos" ? (mesesConDatos.size || 1) : 1;
    return {
      ingresos, gastos, disponible,
      pctGastos: ingresos ? Math.round(gastos / ingresos * 100) : 0,
      pctDisp: ingresos ? Math.round(disponible / ingresos * 100) : 0,
      promDispMensual: disponible / nMeses
    };
  }

  const gridColor = "rgba(139,148,158,.12)";
  const tickColor = "#8b949e";
  function axisOpts(extra = {}) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#e6edf3", font: { size: 12 } } },
        tooltip: {
          callbacks: { label: (c) => `${c.dataset.label || c.label}: ${fmtARS(c.parsed.y ?? c.parsed)}` }
        }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: tickColor } },
        y: { grid: { color: gridColor }, ticks: { color: tickColor, callback: (v) => fmtNum(v) } }
      },
      ...extra
    };
  }

  function buildEvolucion(canvas) {
    const idxs = mes === "Todos" ? [...Array(12).keys()] : [mes];
    const labels = idxs.map(i => Store.MESES[i]);
    const dataIng = idxs.map(i => Store.totalIngresosMes(anio, i));
    const dataGas = idxs.map(i => Store.totalGastosMes(anio, i));

    charts.push(new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Ingresos", data: dataIng, backgroundColor: "rgba(88,166,255,.75)", borderRadius: 4 },
          { label: "Gastos", data: dataGas, backgroundColor: "rgba(210,153,34,.75)", borderRadius: 4 }
        ]
      },
      options: axisOpts()
    }));
  }

  function buildCategoria(canvas) {
    const rango = mes === "Todos" ? [...Array(12).keys()] : [mes];
    const map = {};
    Store.all().forEach(g => {
      const ad = Store.anioData(g, anio);
      const suma = rango.reduce((a, i) => a + (ad.montos[i] || 0), 0);
      if (suma > 0) map[g.categoria] = (map[g.categoria] || 0) + suma;
    });
    const labels = Object.keys(map);
    charts.push(new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{ data: labels.map(l => map[l]),
          backgroundColor: CHART_COLORS.slice(0, labels.length), borderColor: "#161b22", borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: "#e6edf3", font: { size: 12 } } },
          tooltip: { callbacks: { label: (c) => `${c.label}: ${fmtARS(c.parsed)}` } }
        }
      }
    }));
  }

  function buildBalance(canvas, stats) {
    const disp = Math.max(stats.disponible, 0);
    charts.push(new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Gastos", "Disponible"],
        datasets: [{ data: [stats.gastos, disp],
          backgroundColor: ["rgba(210,153,34,.85)", "rgba(63,185,80,.85)"],
          borderColor: "#161b22", borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: "#e6edf3", font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: (c) => {
                const pct = stats.ingresos ? Math.round(c.parsed / stats.ingresos * 100) : 0;
                return `${c.label}: ${fmtARS(c.parsed)} (${pct}%)`;
              }
            }
          }
        }
      }
    }));
  }

  function buildDispMensual(canvas) {
    const labels = Store.MESES.slice();
    const data = [...Array(12).keys()].map(i =>
      Store.totalIngresosMes(anio, i) - Store.totalGastosMes(anio, i));
    const colors = data.map(v => v < 0 ? "rgba(248,81,73,.75)" : "rgba(63,185,80,.75)");

    charts.push(new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{ label: "Disponible", data, backgroundColor: colors, borderRadius: 4 }]
      },
      options: axisOpts({ plugins: { legend: { display: false },
        tooltip: { callbacks: { label: (c) => `Disponible: ${fmtARS(c.parsed.y)}` } } } })
    }));
  }

  return { render };
})();
