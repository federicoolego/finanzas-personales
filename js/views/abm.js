// Vista Gastos (ABM): alta, baja y modificación de gastos (Finanzas Familiar).

const ViewABM = (() => {
  let anio = new Date().getFullYear();

  function render(container) {
    const anios = Store.aniosDisponibles();
    if (!anios.includes(anio)) anio = anios[0];

    const head = el("div", { class: "view-head" }, [
      el("h2", {}, "Gastos"),
      el("button", { class: "btn-primary", onClick: () => openModal(null) }, "+ Nuevo gasto")
    ]);

    const filters = el("div", { class: "filters" }, [
      filterSelect("Año", anios, anio, (v) => { anio = Number(v); rerender(container); })
    ]);

    const gastos = Store.all();
    const body = gastos.length
      ? buildTable(gastos, container)
      : el("div", { class: "empty" }, "No hay gastos cargados. Creá el primero con “+ Nuevo gasto”.");

    container.replaceChildren(head, filters, body);
  }

  function buildTable(gastos, container) {
    const rows = [];
    const cats = Store.categorias();
    cats.forEach(cat => {
      const grupo = gastos.filter(g => g.categoria === cat);
      if (!grupo.length) return;
      rows.push(el("tr", { class: "section-row" }, [
        el("td", { colspan: "4" }, cat)
      ]));
      grupo.forEach(g => {
        const ad = Store.anioData(g, anio);
        const total = ad.montos.reduce((a, b) => a + b, 0);
        rows.push(el("tr", {}, [
          el("td", {}, g.nombre),
          el("td", { html: `<span class="badge cat">${g.categoria}</span>` }),
          el("td", { class: "num" }, fmtARS(total)),
          el("td", { class: "num" }, [
            el("button", { class: "btn-sm", onClick: () => openModal(g) }, "Editar"),
            document.createTextNode(" "),
            el("button", {
              class: "btn-sm danger",
              onClick: () => {
                if (confirm(`¿Eliminar "${g.nombre}"?`)) {
                  Store.remove(g.id); toast("Gasto eliminado"); rerender(container);
                }
              }
            }, "Eliminar")
          ])
        ]));
      });
    });

    const table = el("table", {}, [
      el("thead", {}, el("tr", {}, [
        el("th", {}, "Descripción"),
        el("th", {}, "Categoría"),
        el("th", { class: "num" }, `Total ${anio}`),
        el("th", { class: "num" }, "Acciones")
      ])),
      el("tbody", {}, rows)
    ]);
    return el("div", { class: "table-wrap" }, table);
  }

  function rerender(container) { render(container); }

  // ---- Modal ----
  function openModal(gasto) {
    const modal = document.getElementById("modal");
    const title = document.getElementById("modal-title");
    document.getElementById("f-id").value = gasto ? gasto.id : "";
    document.getElementById("f-nombre").value = gasto ? gasto.nombre : "";
    title.textContent = gasto ? "Editar gasto" : "Nuevo gasto";

    // select de categorías (genéricas)
    const selCat = document.getElementById("f-categoria");
    const cur = gasto ? gasto.categoria : "";
    const opts = [...Store.CATEGORIAS_GASTO];
    if (cur && !opts.includes(cur)) opts.push(cur);
    selCat.replaceChildren(
      el("option", { value: "", disabled: "true" }, "Seleccioná una categoría"),
      ...opts.map(c => el("option", { value: c }, c))
    );
    selCat.value = cur || "";

    // inputs de montos
    const wrap = document.getElementById("montos-inputs");
    const ad = gasto ? Store.anioData(gasto, anio) : { montos: Array(12).fill(0) };
    wrap.replaceChildren(...Store.MESES.map((m, i) =>
      el("div", { class: "monto-cell" }, [
        el("label", {}, `${m} (${anio})`),
        el("input", { type: "number", step: "0.01", min: "0",
          "data-mes": i, value: ad.montos[i] || 0 })
      ])
    ));

    modal.hidden = false;
  }

  function closeModal() { document.getElementById("modal").hidden = true; }

  function submit(e, container) {
    e.preventDefault();
    const id = document.getElementById("f-id").value;
    const nombre = document.getElementById("f-nombre").value.trim();
    const categoria = document.getElementById("f-categoria").value;
    if (!nombre) { toast("La descripción es obligatoria"); return; }
    if (!categoria) { toast("La categoría es obligatoria"); return; }
    const montos = [...document.querySelectorAll("#montos-inputs input")]
      .sort((a, b) => a.dataset.mes - b.dataset.mes)
      .map(i => parseFloat(i.value) || 0);

    if (id) {
      Store.update(Number(id), { nombre, categoria, anio, montos });
      toast("Gasto actualizado");
    } else {
      Store.add({ nombre, categoria, anio, montos });
      toast("Gasto creado");
    }
    closeModal();
    render(container);
  }

  function bindModal(container) {
    document.getElementById("modal-close").onclick = closeModal;
    document.getElementById("btn-cancel").onclick = closeModal;
    document.getElementById("form-gasto").onsubmit = (e) => submit(e, container);
    document.getElementById("modal").addEventListener("click", (e) => {
      if (e.target.id === "modal") closeModal();
    });
  }

  return { render, bindModal };
})();

// helper de filtro reutilizable
function filterSelect(label, options, value, onChange) {
  const sel = el("select", { onChange: (e) => onChange(e.target.value) },
    options.map(o => {
      const opt = el("option", { value: String(o) }, String(o));
      if (String(o) === String(value)) opt.selected = true;
      return opt;
    })
  );
  return el("div", { class: "filter" }, [el("label", {}, label), sel]);
}
