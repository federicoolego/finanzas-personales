// Vista Mes Actual: KPIs de ingresos, gastos y disponible del mes (con %).

const ViewMes = (() => {
  const now = new Date();
  let anio = now.getFullYear();
  let mes = now.getMonth(); // 0-11

  function render(container) {
    const anios = Store.aniosDisponibles();
    if (!anios.includes(anio)) anio = anios[0];

    const filters = el("div", { class: "filters" }, [
      filterSelect("Año", anios, anio, (v) => { anio = Number(v); render(container); }),
      filterSelect("Mes", Store.MESES, Store.MESES[mes],
        (v) => { mes = Store.MESES.indexOf(v); render(container); })
    ]);

    const ingresos = Store.totalIngresosMes(anio, mes);
    const gastos = Store.totalGastosMes(anio, mes);
    const disponible = ingresos - gastos;

    const pctGastos = ingresos > 0 ? Math.round(gastos / ingresos * 100) : 0;
    const pctDisp = ingresos > 0 ? Math.round(disponible / ingresos * 100) : 0;

    const kpis = el("div", { class: "kpi-grid kpi-grid-3" }, [
      kpi("Ingresos del mes", fmtARS(ingresos),
        `${Store.allIngresos().length} conceptos`, "info"),
      kpi("Gastos del mes", fmtARS(gastos),
        ingresos > 0 ? `${pctGastos}% de los ingresos` : "sin ingresos cargados",
        gastos > ingresos && ingresos > 0 ? "danger" : "warn"),
      kpi("Disponible", fmtARS(disponible),
        ingresos > 0 ? `${pctDisp}% de los ingresos` : "cargá los ingresos",
        disponible < 0 ? "danger" : "")
    ]);

    // Barra visual de consumo del ingreso
    const barra = buildBarra(pctGastos);

    // Detalle de gastos por categoría del mes
    const detalle = buildDetalle();

    const head = el("div", { class: "view-head" }, [
      el("h2", {}, `Mes Actual · ${Store.MESES[mes]} ${anio}`)
    ]);

    container.replaceChildren(head, filters, kpis, barra, detalle);
  }

  function buildBarra(pctGastos) {
    const pct = Math.min(pctGastos, 100);
    const over = pctGastos > 100;
    const fill = el("div", {
      class: "prog-fill" + (over ? " over" : (pctGastos > 80 ? " warn" : "")),
      style: `width:${pct}%`
    });
    return el("div", { class: "prog-card" }, [
      el("div", { class: "prog-head" }, [
        el("span", {}, "Consumo del ingreso"),
        el("span", { class: "prog-pct" }, `${pctGastos}%`)
      ]),
      el("div", { class: "prog-track" }, fill),
      el("div", { class: "prog-sub muted" },
        over ? "Los gastos superan los ingresos del mes"
             : `Queda ${Math.max(100 - pctGastos, 0)}% disponible`)
    ]);
  }

  function buildDetalle() {
    const rows = [];
    const totalMes = Store.totalGastosMes(anio, mes);
    Store.categorias().forEach(cat => {
      const grupo = Store.all().filter(g => g.categoria === cat);
      const suma = grupo.reduce((a, g) => a + (Store.anioData(g, anio).montos[mes] || 0), 0);
      if (suma <= 0) return;
      const pct = totalMes > 0 ? Math.round(suma / totalMes * 100) : 0;
      rows.push(el("tr", {}, [
        el("td", { html: `<span class="badge cat">${cat}</span>` }),
        el("td", { class: "num" }, fmtARS(suma)),
        el("td", { class: "num muted" }, `${pct}%`)
      ]));
    });

    if (!rows.length) {
      return el("div", { class: "empty" },
        "No hay gastos cargados para este mes.");
    }

    const table = el("table", {}, [
      el("thead", {}, el("tr", {}, [
        el("th", {}, "Categoría"),
        el("th", { class: "num" }, "Monto"),
        el("th", { class: "num" }, "% del gasto")
      ])),
      el("tbody", {}, rows),
      el("tfoot", {}, el("tr", {}, [
        el("td", {}, "Total gastos"),
        el("td", { class: "num" }, fmtARS(totalMes)),
        el("td", { class: "num" }, "100%")
      ]))
    ]);

    return el("div", {}, [
      el("h3", { class: "block-title" }, "Gastos por categoría"),
      el("div", { class: "table-wrap" }, table)
    ]);
  }

  return { render };
})();

function kpi(label, value, sub, variant) {
  return el("div", { class: "kpi " + (variant || "") }, [
    el("div", { class: "kpi-label" }, label),
    el("div", { class: "kpi-value" }, value),
    el("div", { class: "kpi-sub" }, sub || "")
  ]);
}
