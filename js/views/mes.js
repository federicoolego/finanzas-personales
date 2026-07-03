// Vista Mes Actual: KPIs de ingresos, gastos y disponible del mes (con %).

const ViewMes = (() => {
  const now = new Date();
  let anio = now.getFullYear();
  let mes = now.getMonth(); // 0-11
  const colapsadas = new Set(); // categorías colapsadas (default: todas abiertas)

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

    // Cantidad de gastos sin monto cargado en el mes
    const sinMonto = Store.all().filter(g =>
      (Store.anioData(g, anio).montos[mes] || 0) <= 0).length;

    // Subtexto del KPI de gastos: % + faltantes
    let subGastos;
    if (ingresos > 0) subGastos = `${pctGastos}% de los ingresos`;
    else subGastos = "sin ingresos cargados";
    if (sinMonto > 0) {
      subGastos += ` · ${sinMonto} sin monto cargado`;
    }

    const kpis = el("div", { class: "kpi-grid kpi-grid-3" }, [
      kpi("Ingresos del mes", fmtARS(ingresos),
        `${Store.allIngresos().length} conceptos`, "info"),
      kpi("Gastos del mes", fmtARS(gastos), subGastos,
        gastos > ingresos && ingresos > 0 ? "danger" : "warn"),
      kpi("Disponible", fmtARS(disponible),
        ingresos > 0 ? `${pctDisp}% de los ingresos` : "cargá los ingresos",
        disponible < 0 ? "danger" : "")
    ]);

    // Barra visual de consumo del ingreso
    const barra = buildBarra(pctGastos);

    // Detalle de gastos por categoría del mes (desplegable)
    const detalle = buildDetalle(container);

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

  function buildDetalle(container) {
    const totalMes = Store.totalGastosMes(anio, mes);
    const cats = Store.categorias();

    // Categorías que tienen al menos un gasto definido (aunque el monto sea 0)
    const catsConGastos = cats.filter(cat =>
      Store.all().some(g => g.categoria === cat));

    if (!catsConGastos.length) {
      return el("div", {}, [
        el("h3", { class: "block-title" }, "Gastos por categoría"),
        el("div", { class: "empty" }, "No hay gastos cargados.")
      ]);
    }

    const rows = [];
    catsConGastos.forEach(cat => {
      const grupo = Store.all().filter(g => g.categoria === cat);
      const suma = grupo.reduce((a, g) =>
        a + (Store.anioData(g, anio).montos[mes] || 0), 0);
      const pct = totalMes > 0 ? Math.round(suma / totalMes * 100) : 0;
      const sinMontoCat = grupo.filter(g =>
        (Store.anioData(g, anio).montos[mes] || 0) <= 0).length;
      const abierta = !colapsadas.has(cat);

      // Fila-cabecera de categoría (clickeable)
      const flecha = el("span", { class: "caret" }, abierta ? "▾" : "▸");
      const catCell = el("td", {}, [
        flecha,
        el("span", { class: "badge cat" }, cat),
        sinMontoCat > 0
          ? el("span", { class: "badge sin", title: "Gastos sin monto cargado" },
              `${sinMontoCat} sin monto`)
          : null
      ]);
      rows.push(el("tr", {
        class: "cat-head",
        onClick: () => {
          if (colapsadas.has(cat)) colapsadas.delete(cat);
          else colapsadas.add(cat);
          render(container);
        }
      }, [
        catCell,
        el("td", { class: "num" }, fmtARS(suma)),
        el("td", { class: "num muted" }, `${pct}%`)
      ]));

      // Filas de gastos individuales (si la categoría está abierta)
      if (abierta) {
        grupo.forEach(g => {
          const monto = Store.anioData(g, anio).montos[mes] || 0;
          const sinMonto = monto <= 0;
          rows.push(el("tr", { class: "gasto-row" + (sinMonto ? " row-sin" : "") }, [
            el("td", { class: "gasto-nombre" }, [
              document.createTextNode(g.nombre),
              sinMonto
                ? el("span", { class: "badge sin" }, "● Sin monto cargado")
                : null
            ]),
            el("td", { class: "num" + (sinMonto ? " muted" : "") },
              sinMonto ? "— sin cargar —" : fmtARS(monto)),
            el("td", { class: "num muted" },
              (!sinMonto && suma > 0) ? `${Math.round(monto / suma * 100)}%` : "—")
          ]));
        });
      }
    });

    const table = el("table", {}, [
      el("thead", {}, el("tr", {}, [
        el("th", {}, "Categoría / Gasto"),
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

    const acciones = el("div", { class: "detalle-actions" }, [
      el("button", { class: "btn-sm",
        onClick: () => { colapsadas.clear(); render(container); } }, "Expandir todo"),
      el("button", { class: "btn-sm",
        onClick: () => { catsConGastos.forEach(c => colapsadas.add(c)); render(container); } },
        "Colapsar todo")
    ]);

    return el("div", {}, [
      el("div", { class: "detalle-head" }, [
        el("h3", { class: "block-title" }, "Gastos por categoría"),
        acciones
      ]),
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
