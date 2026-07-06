// ============================================================
//  MONTH LABEL — título del reporte + selector de mes (solo visual)
// ============================================================

window.MonthLabel = (function () {
  const KEY = "cf_month_label_v1";
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const now = new Date();
  const currYear = now.getFullYear();

  // Rango: año anterior, actual y siguiente (36 opciones)
  function buildOptions() {
    const opts = [];
    for (let y = currYear - 1; y <= currYear + 1; y++) {
      for (let m = 0; m < 12; m++) {
        opts.push({ value: `${y}-${String(m + 1).padStart(2, "0")}`, y, m });
      }
    }
    return opts;
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
    } catch (_) {}
    return null;
  }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (_) {} }

  function currentValue() {
    return `${currYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function labelFrom(value) {
    const [y, m] = value.split("-").map(Number);
    return `${MESES[m - 1]} ${y}`;
  }

  const listeners = new Set();
  function onChange(fn) { listeners.add(fn); }

  let selected;

  function init() {
    const sel   = document.getElementById("month-select");
    const title = document.getElementById("month-title");
    if (!sel || !title) return;

    // Rellenar options
    const opts = buildOptions();
    for (const o of opts) {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = `${MESES[o.m]} ${o.y}`;
      sel.appendChild(opt);
    }

    // Estado inicial: guardado > mes actual
    selected = loadSaved() || currentValue();
    sel.value = selected;
    title.textContent = labelFrom(selected);

    sel.addEventListener("change", () => {
      selected = sel.value;
      title.textContent = labelFrom(selected);
      save(selected);
      listeners.forEach(fn => { try { fn(selected); } catch (_) {} });
    });
  }

  // API pública
  return {
    init,
    onChange,
    get value() { return selected || currentValue(); },
    get label() { return labelFrom(selected || currentValue()); },
  };
})();

document.addEventListener("DOMContentLoaded", () => window.MonthLabel.init());
