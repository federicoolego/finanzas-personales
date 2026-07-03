// Vista Pagos del mes: grilla de qué está pago y qué falta pagar.

const ViewPagos = (() => {
  const now = new Date();
  let anio = now.getFullYear();
  let mes = now.getMonth(); // 0-11

  function render(container) {
    const anios = Store.aniosDisponibles();
    if (!anios.includes(anio)) anio = anios[0];

    const filters = el("div", { class: "filters" }, [
      filterSelect("Año", anios, anio, (v) => { anio = Number(v); render(container); }),
      filterSelect("Mes", Store.MESES.map((m, i) => m), Store.MESES[mes],
        (v) => { mes = Store.MESES.indexOf(v); render(container); })
    ]);

    // datos del mes seleccionado
    const gastos = Store.all().filter(g => {
      const ad = Store.anioData(g, anio);
      return ad.montos[mes] > 0; // sólo gastos con monto en ese mes
    });

    let totalMes = 0, totalPagado = 0, totalFalta = 0, cantPagados = 0;
    gastos.forEach(g => {
      const ad = Store.anioData(g, anio);
      const monto = ad.montos[mes];
      totalMes += monto;
      if (ad.pagos[mes]) { totalPagado += monto; cantPagados++; }
      else totalFalta += monto;
    });

    const kpis = el("div", { class: "kpi-grid" }, [
      kpi("Total del mes", fmtARS(totalMes), `${gastos.length} conceptos`, ""),
      kpi("Pagado", fmtARS(totalPagado), `${cantPagados} de ${gastos.length}`, "info"),
      kpi("Falta pagar", fmtARS(totalFalta), `${gastos.length - cantPagados} pendientes`,
        totalFalta > 0 ? "danger" : ""),
      kpi("% completado", (gastos.length ? Math.round(cantPagados / gastos.length * 100) : 0) + "%",
        `${Store.MESES[mes]} ${anio}`, "warn")
    ]);

    const body = gastos.length
      ? buildTable(gastos, container)
      : el("div", { class: "empty" }, `No hay gastos con monto cargado para ${Store.MESES[mes]} ${anio}.`);

    const head = el("div", { class: "view-head" }, [
      el("h2", {}, `Pagos · ${Store.MESES[mes]} ${anio}`)
    ]);

    container.replaceChildren(head, filters, kpis, body);
  }

  function buildTable(gastos, container) {
    const rows = [];
    let tPagado = 0, tFalta = 0;
    Store.categorias().forEach(cat => {
      const grupo = gastos.filter(g => g.categoria === cat);
      if (!grupo.length) return;
      rows.push(el("tr", { class: "section-row" }, [el("td", { colspan: "5" }, cat)]));
      grupo.forEach(g => {
        const ad = Store.anioData(g, anio);
        const monto = ad.montos[mes];
        const pago = ad.pagos[mes];
        if (pago) tPagado += monto; else tFalta += monto;

        const toggle = el("div", {
          class: "pay-toggle" + (pago ? " on" : ""),
          title: pago ? "Marcar como no pagado" : "Marcar como pagado",
          onClick: () => { Store.togglePago(g.id, anio, mes); render(container); }
        });

        rows.push(el("tr", {}, [
          el("td", {}, g.nombre),
          el("td", { class: "muted" }, g.banco || "—"),
          el("td", { class: "num" }, fmtARS(monto)),
          el("td", { html: pago
            ? `<span class="badge pagado">● Pagado</span>`
            : `<span class="badge falta">● Falta pagar</span>` }),
          el("td", {}, toggle)
        ]));
      });
    });

    const table = el("table", {}, [
      el("thead", {}, el("tr", {}, [
        el("th", {}, "Gasto"),
        el("th", {}, "Banco / Medio"),
        el("th", { class: "num" }, "Monto"),
        el("th", {}, "Estado"),
        el("th", {}, "Pagar")
      ])),
      el("tbody", {}, rows),
      el("tfoot", {}, el("tr", {}, [
        el("td", { colspan: "2" }, "Totales"),
        el("td", { class: "num" }, fmtARS(tPagado + tFalta)),
        el("td", { html: `<span class="badge pagado">${fmtARS(tPagado)}</span> ` +
          `<span class="badge falta">${fmtARS(tFalta)}</span>` }),
        el("td", {}, "")
      ]))
    ]);
    return el("div", { class: "table-wrap" }, table);
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
