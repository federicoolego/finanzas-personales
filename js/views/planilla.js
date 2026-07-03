// Vista Planilla: grilla editable tipo Excel para cargar montos por mes.
// Selector Gastos/Ingresos, filtros de Año, Categoría y Meses (multi-checkbox).
// Por default se muestran el mes anterior, el actual y el posterior.
// El mes actual queda resaltado. Edición inline: guarda al perder el foco (blur).

const ViewPlanilla = (() => {
  const now = new Date();
  let anio = now.getFullYear();
  const mesActual = now.getMonth(); // 0-11, para resaltar
  let modo = "gastos";              // "gastos" | "ingresos"
  let catFiltro = "Todas";          // filtro de categoría/tipo

  // Meses visibles (default: anterior, actual y posterior, acotado a 0-11)
  function mesesPorDefecto() {
    const set = new Set();
    [mesActual - 1, mesActual, mesActual + 1].forEach(i => {
      if (i >= 0 && i <= 11) set.add(i);
    });
    return set;
  }
  let mesesVisibles = mesesPorDefecto();

  function render(container) {
    const anios = Store.aniosDisponibles();
    if (!anios.includes(anio)) anio = anios[0];

    const esGastos = modo === "gastos";
    const cats = esGastos ? Store.categorias() : Store.tiposIngreso();
    const labelCat = esGastos ? "Categoría" : "Tipo";
    if (catFiltro !== "Todas" && !cats.includes(catFiltro)) catFiltro = "Todas";

    // Selector de modo (Gastos / Ingresos)
    const toggle = el("div", { class: "seg-toggle" }, [
      el("button", {
        class: "seg-btn" + (esGastos ? " active" : ""),
        onClick: () => { if (modo !== "gastos") { modo = "gastos"; catFiltro = "Todas"; render(container); } }
      }, "Gastos"),
      el("button", {
        class: "seg-btn" + (!esGastos ? " active" : ""),
        onClick: () => { if (modo !== "ingresos") { modo = "ingresos"; catFiltro = "Todas"; render(container); } }
      }, "Ingresos")
    ]);

    const filters = el("div", { class: "filters" }, [
      el("div", { class: "filter" }, [el("label", {}, "Ver"), toggle]),
      filterSelect("Año", anios, anio, (v) => { anio = Number(v); render(container); }),
      filterSelect(labelCat, ["Todas", ...cats], catFiltro,
        (v) => { catFiltro = v; render(container); }),
      buildMesesFilter(container)
    ]);

    const head = el("div", { class: "view-head" }, [
      el("h2", {}, `Planilla · ${esGastos ? "Gastos" : "Ingresos"} ${anio}`),
      el("button", { class: "btn-primary",
        onClick: () => nuevaFila(container) }, esGastos ? "+ Nuevo gasto" : "+ Nuevo ingreso")
    ]);

    const grilla = buildGrilla(container, esGastos);

    const hint = el("div", { class: "planilla-hint muted" },
      "Editá cualquier celda de monto y hacé clic afuera (o Enter) para guardar. " +
      "Usá el filtro de Meses para elegir qué columnas ver. El mes actual está resaltado.");

    container.replaceChildren(head, filters, grilla, hint);
  }

  // Filtro de meses con checkboxes (multi-selección) + accesos rápidos.
  function buildMesesFilter(container) {
    const checks = Store.MESES.map((m, i) => {
      const cb = el("input", {
        type: "checkbox", "data-mes": i,
        onChange: (e) => {
          if (e.target.checked) mesesVisibles.add(i);
          else mesesVisibles.delete(i);
          if (mesesVisibles.size === 0) mesesVisibles = mesesPorDefecto();
          render(container);
        }
      });
      if (mesesVisibles.has(i)) cb.checked = true;
      return el("label", { class: "mes-check" + (i === mesActual ? " es-actual" : "") },
        [cb, document.createTextNode(m.slice(0, 3))]);
    });

    const acciones = el("div", { class: "mes-check-actions" }, [
      el("button", { class: "link-btn",
        onClick: () => { mesesVisibles = new Set([...Array(12).keys()]); render(container); } }, "Todos"),
      el("button", { class: "link-btn",
        onClick: () => { mesesVisibles = mesesPorDefecto(); render(container); } }, "Actuales")
    ]);

    return el("div", { class: "filter filter-meses" }, [
      el("label", {}, "Meses"),
      el("div", { class: "mes-checks" }, [...checks, acciones])
    ]);
  }

  // Índices de meses visibles, ordenados cronológicamente.
  function mesesOrdenados() {
    return [...mesesVisibles].sort((a, b) => a - b);
  }

  function buildGrilla(container, esGastos) {
    const items = (esGastos ? Store.all() : Store.allIngresos())
      .filter(x => catFiltro === "Todas"
        ? true
        : (esGastos ? x.categoria : x.tipo) === catFiltro);

    if (!items.length) {
      return el("div", { class: "empty" },
        `No hay ${esGastos ? "gastos" : "ingresos"} para mostrar. ` +
        `Creá uno con el botón de arriba.`);
    }

    const meses = mesesOrdenados();
    const esAnioActual = anio === now.getFullYear();
    const colCount = 2 + meses.length + 1; // desc + cat + meses + total

    // Encabezado: Descripción, Categoría/Tipo, meses visibles (nombre completo), Total
    const ths = [
      el("th", { class: "col-desc" }, "Descripción"),
      el("th", { class: "col-cat" }, esGastos ? "Categoría" : "Tipo")
    ];
    meses.forEach(i => {
      ths.push(el("th", {
        class: "col-mes num" + (i === mesActual && esAnioActual ? " mes-actual" : "")
      }, Store.MESES[i].toUpperCase()));
    });
    ths.push(el("th", { class: "num col-total" }, "Total"));

    // Agrupamos por categoría (gastos) o tipo (ingresos), respetando el orden
    // de la lista canónica, y dentro de cada grupo ordenamos por descripción.
    const grupos = esGastos ? Store.categorias() : Store.tiposIngreso();
    const totalesMes = {};
    meses.forEach(i => totalesMes[i] = 0);

    const bodyRows = [];
    grupos.forEach(grupo => {
      const delGrupo = items
        .filter(x => (esGastos ? x.categoria : x.tipo) === grupo)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      if (!delGrupo.length) return;

      // Fila separadora de grupo
      bodyRows.push(el("tr", { class: "section-row" }, [
        el("td", { colspan: String(colCount) }, grupo)
      ]));

      delGrupo.forEach(it => {
        const ad = esGastos ? Store.anioData(it, anio) : Store.anioDataIng(it, anio);
        let totalFila = 0;

        const celdas = [
          el("td", { class: "col-desc" }, it.nombre),
          el("td", { class: "col-cat" },
            el("span", { class: "badge cat" }, esGastos ? it.categoria : it.tipo))
        ];

        meses.forEach(i => {
          const valor = ad.montos[i] || 0;
          totalFila += valor;
          totalesMes[i] += valor;

          const input = el("input", {
            type: "number", step: "0.01", min: "0",
            class: "cell-input" + (valor <= 0 ? " vacio" : ""),
            value: valor || "",
            "data-id": it.id, "data-mes": i,
            placeholder: "0"
          });

          input.addEventListener("blur", () => {
            const nuevo = parseFloat(input.value) || 0;
            if (esGastos) Store.setMontoGasto(it.id, anio, i, nuevo);
            else Store.setMontoIngreso(it.id, anio, i, nuevo);
            render(container);
          });
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); input.blur(); }
          });

          celdas.push(el("td", {
            class: "col-mes num" + (i === mesActual && esAnioActual ? " mes-actual" : "")
          }, input));
        });

        celdas.push(el("td", { class: "num col-total" }, fmtARS(totalFila)));
        bodyRows.push(el("tr", {}, celdas));
      });
    });

    // Fila de totales por mes (solo meses visibles)
    const footCells = [
      el("td", { class: "col-desc" }, "Totales"),
      el("td", { class: "col-cat" }, "")
    ];
    let totalGeneral = 0;
    meses.forEach(i => {
      totalGeneral += totalesMes[i];
      footCells.push(el("td", {
        class: "col-mes num" + (i === mesActual && esAnioActual ? " mes-actual" : "")
      }, fmtARS(totalesMes[i])));
    });
    footCells.push(el("td", { class: "num col-total" }, fmtARS(totalGeneral)));

    const table = el("table", { class: "planilla-table" }, [
      el("thead", {}, el("tr", {}, ths)),
      el("tbody", {}, bodyRows),
      el("tfoot", {}, el("tr", {}, footCells))
    ]);

    return el("div", { class: "table-wrap planilla-wrap" }, table);
  }

  // Crear una fila nueva reutilizando los modales existentes de ABM/Ingresos
  function nuevaFila(container) {
    if (modo === "gastos") {
      ViewABM.openModalExterno(() => render(container), anio);
    } else {
      ViewIngresos.openModalExterno(() => render(container), anio);
    }
  }

  return { render };
})();
