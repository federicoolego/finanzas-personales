// Vista Planilla: grilla editable tipo Excel para cargar montos por mes.
// Selector Gastos/Ingresos, filtros de Año y Categoría, 12 meses siempre visibles
// con el mes actual resaltado. Edición inline: guarda al perder el foco (blur).

const ViewPlanilla = (() => {
  const now = new Date();
  let anio = now.getFullYear();
  const mesActual = now.getMonth(); // 0-11, para resaltar
  let modo = "gastos";              // "gastos" | "ingresos"
  let catFiltro = "Todas";          // filtro de categoría/tipo

  function render(container) {
    const anios = Store.aniosDisponibles();
    if (!anios.includes(anio)) anio = anios[0];

    // Opciones de categoría/tipo según el modo
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
        (v) => { catFiltro = v; render(container); })
    ]);

    const head = el("div", { class: "view-head" }, [
      el("h2", {}, `Planilla · ${esGastos ? "Gastos" : "Ingresos"} ${anio}`),
      el("button", { class: "btn-primary",
        onClick: () => nuevaFila(container) }, esGastos ? "+ Nuevo gasto" : "+ Nuevo ingreso")
    ]);

    const grilla = buildGrilla(container, esGastos, cats);

    const hint = el("div", { class: "planilla-hint muted" },
      "Editá cualquier celda de monto y hacé clic afuera (o Tab) para guardar. " +
      "El mes actual está resaltado.");

    container.replaceChildren(head, filters, grilla, hint);
  }

  function buildGrilla(container, esGastos, cats) {
    const items = (esGastos ? Store.all() : Store.allIngresos())
      .filter(x => catFiltro === "Todas"
        ? true
        : (esGastos ? x.categoria : x.tipo) === catFiltro);

    if (!items.length) {
      return el("div", { class: "empty" },
        `No hay ${esGastos ? "gastos" : "ingresos"} para mostrar. ` +
        `Creá uno con el botón de arriba.`);
    }

    // Encabezado: Descripción, Categoría/Tipo, 12 meses, Total
    const ths = [
      el("th", { class: "col-desc" }, "Descripción"),
      el("th", { class: "col-cat" }, esGastos ? "Categoría" : "Tipo")
    ];
    Store.MESES.forEach((m, i) => {
      ths.push(el("th", {
        class: "col-mes num" + (i === mesActual && anio === now.getFullYear() ? " mes-actual" : "")
      }, m.slice(0, 3).toUpperCase()));
    });
    ths.push(el("th", { class: "num col-total" }, "Total"));

    // Filas de datos
    const totalesMes = Array(12).fill(0);
    const bodyRows = items.map(it => {
      const ad = esGastos ? Store.anioData(it, anio) : Store.anioDataIng(it, anio);
      let totalFila = 0;

      const celdas = [
        el("td", { class: "col-desc" }, it.nombre),
        el("td", { class: "col-cat" },
          el("span", { class: "badge cat" }, esGastos ? it.categoria : it.tipo))
      ];

      Store.MESES.forEach((m, i) => {
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
          const guardado = esGastos
            ? Store.setMontoGasto(it.id, anio, i, nuevo)
            : Store.setMontoIngreso(it.id, anio, i, nuevo);
          // Re-render para actualizar totales de fila/columna y el resaltado de vacío
          render(container);
        });
        // Enter mueve el foco (dispara blur -> guarda)
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); input.blur(); }
        });

        celdas.push(el("td", {
          class: "col-mes num" + (i === mesActual && anio === now.getFullYear() ? " mes-actual" : "")
        }, input));
      });

      celdas.push(el("td", { class: "num col-total" }, fmtARS(totalFila)));
      return el("tr", {}, celdas);
    });

    // Fila de totales por mes
    const footCells = [
      el("td", { class: "col-desc" }, "Totales"),
      el("td", { class: "col-cat" }, "")
    ];
    let totalGeneral = 0;
    totalesMes.forEach((t, i) => {
      totalGeneral += t;
      footCells.push(el("td", {
        class: "col-mes num" + (i === mesActual && anio === now.getFullYear() ? " mes-actual" : "")
      }, fmtARS(t)));
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
