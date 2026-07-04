// ============================================================
//  APP — interfaz de la calculadora
// ============================================================

(async function () {
  const app = document.getElementById("app");
  const sub = document.getElementById("brand-sub");
  const badge = document.getElementById("sync-badge");

  try {
    await Store.load();
  } catch (err) {
    app.replaceChildren(
      el("div", { class: "empty" },
        "No se pudo conectar con la base de datos. Revisá tu configuración de Supabase en js/config.js. Detalle: " + err.message)
    );
    return;
  }

  if (Store.usaSupabase) {
    badge.textContent = "Nube";
    badge.className = "sync-badge sync-cloud";
    badge.title = "Guardando en Supabase · se comparte entre dispositivos";
    sub.textContent = "Sincronizado en la nube";
  } else {
    badge.textContent = "Local";
    badge.className = "sync-badge sync-local";
    badge.title = "Guardando solo en este navegador";
    sub.textContent = "Guardado local · sin sincronizar";
  }

  const CATS = [
    { key: "ingreso", titulo: "Ingresos",    signo: "+", clase: "cat-ingreso" },
    { key: "gasto",   titulo: "Gastos Fijos", signo: "−", clase: "cat-gasto" },
    { key: "reserva", titulo: "Reservas",    signo: "−", clase: "cat-reserva" },
  ];

  function render() {
    const bloques = CATS.map(buildBloque);
    const resultado = buildResultado();
    app.replaceChildren(...bloques, resultado);
  }

  function buildBloque(cat) {
    const lista = Store.porCategoria(cat.key);
    const totalCat = Store.total(cat.key);

    const filas = lista.map(item => el("div", { class: "row" }, [
      // Nombre editable
      el("input", {
        class: "row-nombre", type: "text", value: item.nombre,
        onchange: (e) => Store.update(item.id, { nombre: e.target.value.trim() || "(sin nombre)" })
          .then(() => { toast("Guardado"); })
      }),
      // Monto editable
      el("div", { class: "row-monto-wrap" }, [
        el("span", { class: "peso" }, "$"),
        el("input", {
          class: "row-monto", type: "text", inputmode: "decimal",
          value: new Intl.NumberFormat("es-AR").format(item.monto || 0),
          onfocus: (e) => e.target.select(),
          onchange: (e) => {
            const n = parseMonto(e.target.value);
            e.target.value = new Intl.NumberFormat("es-AR").format(n);
            Store.update(item.id, { monto: n }).then(render);
          }
        })
      ]),
      // Eliminar
      el("button", {
        class: "row-del", title: "Eliminar ítem",
        onclick: () => {
          if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
          Store.remove(item.id).then(() => { toast("Ítem eliminado"); render(); });
        }
      }, "✕")
    ]));

    const addBtn = el("button", { class: "add-item",
      onclick: () => {
        Store.add(cat.key, "Nuevo ítem", 0).then(() => render());
      }
    }, "+ Agregar ítem");

    return el("section", { class: "bloque " + cat.clase }, [
      el("div", { class: "bloque-head" }, [
        el("h2", {}, cat.titulo),
        el("div", { class: "bloque-total" }, [
          el("span", { class: "signo" }, cat.signo),
          el("span", {}, fmtARS(totalCat))
        ])
      ]),
      el("div", { class: "rows" }, filas.length ? filas
        : [el("div", { class: "row-empty" }, "Sin ítems todavía.")]),
      addBtn
    ]);
  }

  function buildResultado() {
    const ing = Store.total("ingreso");
    const gas = Store.total("gasto");
    const res = Store.total("reserva");
    const bal = ing - gas - res;
    const negativo = bal < 0;

    return el("section", { class: "resultado " + (negativo ? "neg" : "pos") }, [
      el("div", { class: "res-cuenta" }, [
        cuentaItem("Ingresos", ing, "op-ing"),
        el("span", { class: "op" }, "−"),
        cuentaItem("Gastos Fijos", gas, "op-gas"),
        el("span", { class: "op" }, "−"),
        cuentaItem("Reservas", res, "op-res"),
      ]),
      el("div", { class: "res-final" }, [
        el("span", { class: "res-label" }, negativo ? "Te faltan" : "Te queda disponible"),
        el("span", { class: "res-valor" }, fmtARS(bal))
      ])
    ]);
  }

  function cuentaItem(label, valor, clase) {
    return el("div", { class: "cuenta-item " + clase }, [
      el("span", { class: "cuenta-label" }, label),
      el("span", { class: "cuenta-valor" }, fmtARS(valor))
    ]);
  }

  render();
})();
