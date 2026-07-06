// ============================================================
//  MONTH LABEL — título del reporte + selector de mes (solo visual)
// ============================================================

window.MonthLabel = (function () {
  const KEY = "cf_month_label_v1";
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const YEAR = new Date().getFullYear();
  const CURR_MONTH = new Date().getMonth(); // 0-11

  function loadSaved() {
    try {
      const raw = localStorage.getItem(KEY);
      const n = parseInt(raw, 10);
      if (Number.isInteger(n) && n >= 0 && n <= 11) return n;
    } catch (_) {}
    return null;
  }
  function save(m) { try { localStorage.setItem(KEY, String(m)); } catch (_) {} }

  const listeners = new Set();
  function onChange(fn) { listeners.add(fn); }

  let selectedMonth;

  function labelFor(m) { return `${MESES[m]} ${YEAR}`; }

  function init() {
    const sel   = document.getElementById("month-select");
    const title = document.getElementById("month-title");
    if (!sel || !title) return;

    // 12 opciones fijas
    for (let m = 0; m < 12; m++) {
      const opt = document.createElement("option");
      opt.value = String(m);
      opt.textContent = MESES[m];
      sel.appendChild(opt);
    }

    // Estado inicial: guardado > mes actual
    const saved = loadSaved();
    selectedMonth = saved !== null ? saved : CURR_MONTH;
    sel.value = String(selectedMonth);
    title.textContent = labelFor(selectedMonth);

    sel.addEventListener("change", () => {
      selectedMonth = parseInt(sel.value, 10);
      title.textContent = labelFor(selectedMonth);
      save(selectedMonth);
      listeners.forEach(fn => { try { fn(selectedMonth); } catch (_) {} });
    });
  }

  return {
    init,
    onChange,
    get value() { return selectedMonth != null ? selectedMonth : CURR_MONTH; },
    get label() { return labelFor(selectedMonth != null ? selectedMonth : CURR_MONTH); },
  };
})();

document.addEventListener("DOMContentLoaded", () => window.MonthLabel.init());
