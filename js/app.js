// Controlador principal: navegación entre vistas e import/export.

(function () {
  Store.load();

  const app = document.getElementById("app");
  document.getElementById("modal").hidden = true; // arranca siempre cerrado
  ViewABM.bindModal(app);

  const views = {
    dashboard: ViewDashboard,
    pagos: ViewPagos,
    abm: ViewABM
  };

  function show(name) {
    document.querySelectorAll(".tab").forEach(t =>
      t.classList.toggle("active", t.dataset.view === name));
    views[name].render(app);
  }

  document.querySelectorAll(".tab").forEach(tab =>
    tab.addEventListener("click", () => show(tab.dataset.view)));

  // ---- Export ----
  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([Store.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `gastos-fijos-${Date.now()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Datos exportados");
  });

  // ---- Import ----
  const fileInput = document.getElementById("file-import");
  document.getElementById("btn-import").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJSON(reader.result);
        toast("Datos importados");
        show(document.querySelector(".tab.active").dataset.view);
      } catch (err) {
        toast("Error al importar: " + err.message);
      }
      fileInput.value = "";
    };
    reader.readAsText(file);
  });

  show("dashboard");
})();
