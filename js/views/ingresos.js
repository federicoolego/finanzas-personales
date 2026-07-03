// Vista Ingresos (ABM): alta, baja y modificación de ingresos.

const ViewIngresos = (() => {
  let anio = new Date().getFullYear();
  let onSavedExterno = null; // callback opcional al guardar desde otra vista

  function render(container) {
    const anios = Store.aniosDisponibles();
    if (!anios.includes(anio)) anio = anios[0];

    const head = el("div", { class: "view-head" }, [
      el("h2", {}, "Ingresos"),
      el("button", { class: "btn-primary", onClick: () => openModal(null) }, "+ Nuevo ingreso")
    ]);

    const filters = el("div", { class: "filters" }, [
      filterSelect("Año", anios, anio, (v) => { anio = Number(v); rerender(container); })
    ]);

    const ingresos = Store.allIngresos();
    const body = ingresos.length
      ? buildTable(ingresos, container)
      : el("div", { class: "empty" }, "No hay ingresos cargados. Creá el primero con “+ Nuevo ingreso”.");

    container.replaceChildren(head, filters, body);
  }

  function buildTable(ingresos, container) {
    const rows = [];
    Store.tiposIngreso().forEach(tipo => {
      const grupo = ingresos.filter(i => i.tipo === tipo);
      if (!grupo.length) return;
      rows.push(el("tr", { class: "section-row" }, [
        el("td", { colspan: "4" }, tipo)
      ]));
      grupo.forEach(i => {
        const ad = Store.anioDataIng(i, anio);
        const total = ad.montos.reduce((a, b) => a + b, 0);
        rows.push(el("tr", {}, [
          el("td", {}, i.nombre),
          el("td", { html: `<span class="badge cat">${i.tipo}</span>` }),
          el("td", { class: "num" }, fmtARS(total)),
          el("td", { class: "num" }, [
            el("button", { class: "btn-sm", onClick: () => openModal(i) }, "Editar"),
            document.createTextNode(" "),
            el("button", {
              class: "btn-sm danger",
              onClick: () => {
                if (confirm(`¿Eliminar "${i.nombre}"?`)) {
                  Store.removeIngreso(i.id); toast("Ingreso eliminado"); rerender(container);
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
        el("th", {}, "Tipo"),
        el("th", { class: "num" }, `Total ${anio}`),
        el("th", { class: "num" }, "Acciones")
      ])),
      el("tbody", {}, rows)
    ]);
    return el("div", { class: "table-wrap" }, table);
  }

  function rerender(container) { render(container); }

  // ---- Modal ----
  function openModal(ingreso) {
    const modal = document.getElementById("modal-ing");
    document.getElementById("modal-ing-title").textContent =
      ingreso ? "Editar ingreso" : "Nuevo ingreso";
    document.getElementById("fi-id").value = ingreso ? ingreso.id : "";
    document.getElementById("fi-nombre").value = ingreso ? ingreso.nombre : "";

    const selTipo = document.getElementById("fi-tipo");
    const cur = ingreso ? ingreso.tipo : "";
    const opts = [...Store.tiposIngreso()];
    if (cur && !opts.includes(cur)) opts.push(cur);
    selTipo.replaceChildren(
      el("option", { value: "", disabled: "true" }, "Seleccioná un tipo"),
      ...opts.map(t => el("option", { value: t }, t))
    );
    selTipo.value = cur || "";

    const wrap = document.getElementById("montos-ing-inputs");
    const ad = ingreso ? Store.anioDataIng(ingreso, anio) : { montos: Array(12).fill(0) };
    wrap.replaceChildren(...Store.MESES.map((m, i) =>
      el("div", { class: "monto-cell" }, [
        el("label", {}, `${m} (${anio})`),
        el("input", { type: "number", step: "0.01", min: "0",
          "data-mes": i, value: ad.montos[i] || 0 })
      ])
    ));

    modal.hidden = false;
  }

  function closeModal() { onSavedExterno = null; document.getElementById("modal-ing").hidden = true; }

  function submit(e, container) {
    e.preventDefault();
    const id = document.getElementById("fi-id").value;
    const nombre = document.getElementById("fi-nombre").value.trim().toUpperCase();
    const tipo = document.getElementById("fi-tipo").value;
    if (!nombre) { toast("La descripción es obligatoria"); return; }
    if (!tipo) { toast("El tipo es obligatorio"); return; }
    const montos = [...document.querySelectorAll("#montos-ing-inputs input")]
      .sort((a, b) => a.dataset.mes - b.dataset.mes)
      .map(i => parseFloat(i.value) || 0);

    if (id) {
      Store.updateIngreso(Number(id), { nombre, tipo, anio, montos });
      toast("Ingreso actualizado");
    } else {
      Store.addIngreso({ nombre, tipo, anio, montos });
      toast("Ingreso creado");
    }
    const cb = onSavedExterno;
    closeModal();
    if (cb) cb(); else render(container);
  }

  // Abre el modal en modo alta desde otra vista (ej. Planilla).
  function openModalExterno(onSaved, usarAnio) {
    if (usarAnio) anio = Number(usarAnio);
    onSavedExterno = onSaved || null;
    openModal(null);
  }

  function bindModal(container) {
    document.getElementById("modal-ing-close").onclick = closeModal;
    document.getElementById("btn-ing-cancel").onclick = closeModal;
    document.getElementById("form-ingreso").onsubmit = (e) => submit(e, container);
    document.getElementById("modal-ing").addEventListener("click", (e) => {
      if (e.target.id === "modal-ing") closeModal();
    });
  }

  return { render, bindModal, openModalExterno };
})();
