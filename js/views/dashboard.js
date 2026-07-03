// Vista Dashboard: KPIs y gráficos con filtros por Gasto, Año y Mes.

const ViewDashboard = (() => {
  let anio = new Date().getFullYear();
  let mes = "Todos";          // "Todos" o 0-11
  let gastoFiltro = "Todos";  // "Todos" o nombre de gasto
  const charts = [];

  function destroyCharts() {
    while (charts.length) { const c = charts.pop(); c.destroy(); }
  }

  function render(container) {
    destroyCharts();
    const anios = Store.aniosDisponibles();
    if (!anios.includes(anio)) anio = anios[0];

    const nombres = ["Todos", ...Store.all().map(g => g.nombre)];
    const mesesOpts = ["Todos", ...Store.MESES];

    const filters = el("div", { class: "filters" }, [
      filterSelect("Gasto", nombres, gastoFiltro, (v) => { gastoFiltro = v; render(container); }),
      filterSelect("Año", anios, anio, (v) => { anio = Number(v); render(container); }),
      filterSelect("Mes", mesesOpts, mes === "Todos" ? "Todos" : Store.MESES[mes],
        (v) => { mes = v === "Todos" ? "Todos" : Store.MESES.indexOf(v); render(container); })
    ]);

    const gastos = Store.all().filter(g =>
      gastoFiltro === "Todos" ? true : g.nombre === gastoFiltro);

    const stats = computeStats(gastos);

    const kpis = el("div", { class: "kpi-grid" }, [
      kpi("Total período", fmtARS(stats.total),
        mes === "Todos" ? `Año ${anio}` : `${Store.MESES[mes]} ${anio}`, ""),
      kpi("Pagado", fmtARS(stats.pagado), `${stats.pctPagado}% del total`, "info"),
      kpi("Falta pagar", fmtARS(stats.falta),
        `${stats.pendientes} conceptos`, stats.falta > 0 ? "danger" : ""),
      kpi("Promedio mensual", fmtARS(stats.promMensual),
        mes === "Todos" ? "meses con gasto" : "en el mes", "warn")
    ]);

    // contenedores de canvas
    const cEvolucion = el("canvas");
    const cCategoria = el("canvas");
    const cTop = el("canvas");
    const cEstado = el("canvas");

    const chartGrid = el("div", { class: "chart-grid" }, [
      el("div", { class: "chart-card full" }, [
        el("h3", {}, mes === "Todos"
          ? `Evolución mensual — ${anio}`
          : `Evolución — ${Store.MESES[mes]} ${anio}`),
        el("div", { class: "chart-wrap" }, cEvolucion)
      ]),
      el("div", { class: "chart-card" }, [
        el("h3", {}, "Distribución por categoría"),
        el("div", { class: "chart-wrap" }, cCategoria)
      ]),
      el("div", { class: "chart-card" }, [
        el("h3", {}, "Pagado vs. Falta pagar"),
        el("div", { class: "chart-wrap" }, cEstado)
      ]),
      el("div", { class: "chart-card full" }, [
        el("h3", {}, "Top gastos del período"),
        el("div", { class: "chart-wrap" }, cTop)
      ])
    ]);

    const head = el("div", { class: "view-head" }, [el("h2", {}, "Dashboard")]);
    container.replaceChildren(head, filters, kpis, chartGrid);

    // los gráficos se crean después de insertar los canvas en el DOM
    requestAnimationFrame(() => {
      buildEvolucion(cEvolucion, gastos);
      buildCategoria(cCategoria, gastos);
      buildEstado(cEstado, stats);
      buildTop(cTop, gastos);
    });
  }

  function computeStats(gastos) {
    let total = 0, pagado = 0, falta = 0, pendientes = 0;
    const mesesConGasto = new Set();
    gastos.forEach(g => {
      const ad = Store.anioData(g, anio);
      const rango = mes === "Todos" ? [...Array(12).keys()] : [mes];
      rango.forEach(i => {
        const m = ad.montos[i];
        if (m > 0) {
          total += m; mesesConGasto.add(i);
          if (ad.pagos[i]) pagado += m;
          else { falta += m; pendientes++; }
        }
      });
    });
    const nMeses = mes === "Todos" ? (mesesConGasto.size || 1) : 1;
    return {
      total, pagado, falta, pendientes,
      pctPagado: total ? Math.round(pagado / total * 100) : 0,
      promMensual: total / nMeses
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

  function buildEvolucion(canvas, gastos) {
    const totalMes = Array(12).fill(0);
    const pagadoMes = Array(12).fill(0);
    gastos.forEach(g => {
      const ad = Store.anioData(g, anio);
      for (let i = 0; i < 12; i++) {
        totalMes[i] += ad.montos[i];
        if (ad.pagos[i]) pagadoMes[i] += ad.montos[i];
      }
    });

    // Si hay un mes filtrado, mostramos sólo ese mes; si no, el año completo.
    const idxs = mes === "Todos" ? [...Array(12).keys()] : [mes];
    const labels = idxs.map(i => Store.MESES[i]);
    const dataTotal = idxs.map(i => totalMes[i]);
    const dataPagado = idxs.map(i => pagadoMes[i]);

    charts.push(new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Total", data: dataTotal, backgroundColor: "rgba(88,166,255,.55)", borderRadius: 4 },
          { label: "Pagado", data: dataPagado, backgroundColor: "rgba(63,185,80,.75)", borderRadius: 4 }
        ]
      },
      options: axisOpts()
    }));
  }

  function buildCategoria(canvas, gastos) {
    const map = {};
    gastos.forEach(g => {
      const ad = Store.anioData(g, anio);
      const rango = mes === "Todos" ? [...Array(12).keys()] : [mes];
      const suma = rango.reduce((a, i) => a + ad.montos[i], 0);
      map[g.categoria] = (map[g.categoria] || 0) + suma;
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

  function buildEstado(canvas, stats) {
    charts.push(new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Pagado", "Falta pagar"],
        datasets: [{ data: [stats.pagado, stats.falta],
          backgroundColor: ["rgba(63,185,80,.8)", "rgba(248,81,73,.8)"],
          borderColor: "#161b22", borderWidth: 2 }]
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

  function buildTop(canvas, gastos) {
    const arr = gastos.map(g => {
      const ad = Store.anioData(g, anio);
      const rango = mes === "Todos" ? [...Array(12).keys()] : [mes];
      const suma = rango.reduce((a, i) => a + ad.montos[i], 0);
      return { nombre: g.nombre, suma };
    }).filter(x => x.suma > 0).sort((a, b) => b.suma - a.suma).slice(0, 10);

    charts.push(new Chart(canvas, {
      type: "bar",
      data: {
        labels: arr.map(x => x.nombre),
        datasets: [{ label: "Monto", data: arr.map(x => x.suma),
          backgroundColor: "rgba(188,140,255,.7)", borderRadius: 4 }]
      },
      options: axisOpts({
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => fmtARS(c.parsed.x) } }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, callback: (v) => fmtNum(v) } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor } }
        }
      })
    }));
  }

  return { render };
})();
