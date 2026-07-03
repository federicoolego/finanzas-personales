// Store: maneja el estado y la persistencia en localStorage.
// Modelo de datos (Finanzas Familiar):
//   gasto   = { id, nombre, categoria, byAnio: { [anio]: { montos:[12] } } }
//   ingreso = { id, nombre, tipo,      byAnio: { [anio]: { montos:[12] } } }
// El seed original (js/seed.js) trae los datos de la hoja 2026.

const Store = (() => {
  const KEY = "finanzas_familiar_app_v2";
  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const CATEGORIAS_GASTO = ["Deportes", "Deudas", "Educación", "Hogar",
    "Impuestos", "Otros", "Salud", "Seguros", "Servicio",
    "Servicios Profesionales", "Tarjeta de Crédito", "Transporte"];
  const TIPOS_INGRESO = ["Sueldo", "Honorarios", "Otros"];

  let state = { gastos: [], ingresos: [], nextId: 1, nextIngId: 1, aniosExtra: [] };

  function seedState() {
    const gastos = SEED_GASTOS.map(g => ({
      id: g.id,
      nombre: g.nombre,
      categoria: g.categoria,
      byAnio: { [SEED_ANIO]: { montos: g.montos.slice() } }
    }));
    const ingresos = (typeof SEED_INGRESOS !== "undefined" ? SEED_INGRESOS : []).map(i => ({
      id: i.id,
      nombre: i.nombre,
      tipo: i.tipo,
      byAnio: { [SEED_ANIO]: { montos: i.montos.slice() } }
    }));
    return {
      gastos, ingresos,
      nextId: gastos.length + 1,
      nextIngId: ingresos.length + 1,
      aniosExtra: []
    };
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (!parsed.ingresos) parsed.ingresos = [];
        if (!parsed.nextIngId) parsed.nextIngId = (parsed.ingresos.length || 0) + 1;
        if (!parsed.aniosExtra) parsed.aniosExtra = [];
        state = parsed;
        return;
      } catch (e) { /* fall through */ }
    }
    state = seedState();
    save();
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  // ---------- GASTOS ----------
  function all() { return state.gastos; }

  function anioData(gasto, anio) {
    if (!gasto.byAnio[anio]) {
      gasto.byAnio[anio] = { montos: Array(12).fill(0) };
    }
    // migración: descartar 'pagos' si viniera de un modelo anterior
    if (gasto.byAnio[anio].pagos) delete gasto.byAnio[anio].pagos;
    return gasto.byAnio[anio];
  }

  function categorias() {
    // categorías presentes en los datos, respetando el orden de la lista canónica
    const usadas = new Set(state.gastos.map(g => g.categoria));
    const ordenadas = CATEGORIAS_GASTO.filter(c => usadas.has(c));
    const extras = [...usadas].filter(c => !CATEGORIAS_GASTO.includes(c));
    return [...ordenadas, ...extras];
  }

  function add({ nombre, categoria, anio, montos }) {
    const g = {
      id: state.nextId++,
      nombre, categoria,
      byAnio: { [anio]: { montos: montos.slice() } }
    };
    state.gastos.push(g);
    save();
    return g;
  }

  function update(id, { nombre, categoria, anio, montos }) {
    const g = state.gastos.find(x => x.id === id);
    if (!g) return;
    g.nombre = nombre; g.categoria = categoria;
    anioData(g, anio).montos = montos.slice();
    save();
  }

  function remove(id) {
    state.gastos = state.gastos.filter(g => g.id !== id);
    save();
  }

  // ---------- INGRESOS ----------
  function allIngresos() { return state.ingresos; }

  function anioDataIng(ingreso, anio) {
    if (!ingreso.byAnio[anio]) {
      ingreso.byAnio[anio] = { montos: Array(12).fill(0) };
    }
    return ingreso.byAnio[anio];
  }

  function tiposIngreso() { return TIPOS_INGRESO.slice(); }

  function addIngreso({ nombre, tipo, anio, montos }) {
    const i = {
      id: state.nextIngId++,
      nombre, tipo,
      byAnio: { [anio]: { montos: montos.slice() } }
    };
    state.ingresos.push(i);
    save();
    return i;
  }

  function updateIngreso(id, { nombre, tipo, anio, montos }) {
    const i = state.ingresos.find(x => x.id === id);
    if (!i) return;
    i.nombre = nombre; i.tipo = tipo;
    anioDataIng(i, anio).montos = montos.slice();
    save();
  }

  function removeIngreso(id) {
    state.ingresos = state.ingresos.filter(i => i.id !== id);
    save();
  }

  // ---------- AÑOS ----------
  function aniosDisponibles() {
    const set = new Set();
    state.gastos.forEach(g => Object.keys(g.byAnio).forEach(a => set.add(Number(a))));
    state.ingresos.forEach(i => Object.keys(i.byAnio).forEach(a => set.add(Number(a))));
    (state.aniosExtra || []).forEach(a => set.add(Number(a)));
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }

  // Registra un año nuevo (aunque todavía no tenga montos) para que aparezca
  // en los selectores. Devuelve true si se agregó, false si ya existía.
  function addAnio(anio) {
    anio = Number(anio);
    if (!anio || Number.isNaN(anio)) return false;
    if (aniosDisponibles().includes(anio)) return false;
    if (!state.aniosExtra) state.aniosExtra = [];
    state.aniosExtra.push(anio);
    save();
    return true;
  }

  // ---------- AGREGADOS (KPIs) ----------
  // Total de ingresos de un mes (0-11) para un año.
  function totalIngresosMes(anio, mesIdx) {
    return state.ingresos.reduce((acc, i) =>
      acc + (anioDataIng(i, anio).montos[mesIdx] || 0), 0);
  }
  // Total de gastos (Finanzas Familiar) de un mes.
  function totalGastosMes(anio, mesIdx) {
    return state.gastos.reduce((acc, g) =>
      acc + (anioData(g, anio).montos[mesIdx] || 0), 0);
  }

  // ---------- IMPORT / EXPORT ----------
  function exportJSON() { return JSON.stringify(state, null, 2); }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed.gastos || !Array.isArray(parsed.gastos)) {
      throw new Error("Formato inválido");
    }
    if (!parsed.ingresos) parsed.ingresos = [];
    if (!parsed.nextIngId) parsed.nextIngId = parsed.ingresos.length + 1;
    if (!parsed.aniosExtra) parsed.aniosExtra = [];
    state = parsed;
    save();
  }

  function reset() { state = seedState(); save(); }

  return {
    MESES, CATEGORIAS_GASTO, TIPOS_INGRESO,
    load, save,
    all, anioData, categorias, add, update, remove,
    allIngresos, anioDataIng, tiposIngreso, addIngreso, updateIngreso, removeIngreso,
    aniosDisponibles, addAnio, totalIngresosMes, totalGastosMes,
    exportJSON, importJSON, reset
  };
})();
