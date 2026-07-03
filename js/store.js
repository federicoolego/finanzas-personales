// Store: maneja el estado y la persistencia en localStorage.
// Modelo de datos:
//   gasto = { id, banco, nombre, categoria, byAnio: { [anio]: { montos:[12], pagos:[12] } } }
// El seed original (js/seed.js) trae los datos de la hoja 2026.

const Store = (() => {
  const KEY = "gastos_fijos_app_v1";
  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  let state = { gastos: [], nextId: 1 };

  function seedState() {
    const gastos = SEED_GASTOS.map(g => ({
      id: g.id,
      banco: g.banco,
      nombre: g.nombre,
      categoria: g.categoria,
      byAnio: {
        [SEED_ANIO]: {
          montos: g.montos.slice(),
          pagos: g.pagos.slice()
        }
      }
    }));
    return { gastos, nextId: gastos.length + 1 };
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { state = JSON.parse(raw); return; } catch (e) { /* fall through */ }
    }
    state = seedState();
    save();
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function all() { return state.gastos; }

  // Devuelve el registro anual de un gasto, creándolo vacío si no existe.
  function anioData(gasto, anio) {
    if (!gasto.byAnio[anio]) {
      gasto.byAnio[anio] = { montos: Array(12).fill(0), pagos: Array(12).fill(false) };
    }
    return gasto.byAnio[anio];
  }

  function aniosDisponibles() {
    const set = new Set();
    state.gastos.forEach(g => Object.keys(g.byAnio).forEach(a => set.add(Number(a))));
    const cur = new Date().getFullYear();
    set.add(cur);
    return [...set].sort((a, b) => b - a);
  }

  function categorias() {
    return [...new Set(state.gastos.map(g => g.categoria))];
  }

  function bancos() {
    return [...new Set(state.gastos.map(g => g.banco).filter(Boolean))].sort();
  }

  function add({ banco, nombre, categoria, anio, montos }) {
    const g = {
      id: state.nextId++,
      banco, nombre, categoria,
      byAnio: { [anio]: { montos: montos.slice(), pagos: Array(12).fill(false) } }
    };
    state.gastos.push(g);
    save();
    return g;
  }

  function update(id, { banco, nombre, categoria, anio, montos }) {
    const g = state.gastos.find(x => x.id === id);
    if (!g) return;
    g.banco = banco; g.nombre = nombre; g.categoria = categoria;
    const ad = anioData(g, anio);
    ad.montos = montos.slice();
    save();
  }

  function remove(id) {
    state.gastos = state.gastos.filter(g => g.id !== id);
    save();
  }

  function togglePago(id, anio, mesIdx) {
    const g = state.gastos.find(x => x.id === id);
    if (!g) return;
    const ad = anioData(g, anio);
    ad.pagos[mesIdx] = !ad.pagos[mesIdx];
    save();
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed.gastos || !Array.isArray(parsed.gastos)) {
      throw new Error("Formato inválido");
    }
    state = parsed;
    save();
  }

  function reset() {
    state = seedState();
    save();
  }

  return {
    MESES, load, save, all, anioData, aniosDisponibles, categorias, bancos,
    add, update, remove, togglePago, exportJSON, importJSON, reset
  };
})();
