// ============================================================
//  STORE — estado y persistencia
// ============================================================
//  Modelo de datos:
//    item = { id, categoria: "ingreso"|"gasto"|"reserva", nombre, monto, orden }
//
//  Si config.js tiene URL + clave de Supabase  -> guarda en la nube
//  (tabla "items"), compartido entre dispositivos.
//  Si no                                        -> guarda en localStorage
//  (solo en este navegador).
// ============================================================

const Store = (() => {
  const LS_KEY = "calc_familiar_v1";
  const usaSupabase = !!(SUPABASE_URL && SUPABASE_ANON);
  let sb = null;
  let items = [];

  // ---- Datos iniciales (los de tu planilla) ----
  function seed() {
    const s = (categoria, lista) =>
      lista.map((x, i) => ({
        id: uid(), categoria, nombre: x[0], monto: x[1], orden: i
      }));
    return [
      ...s("ingreso", [
        ["Sueldo Fede", 7000000],
        ["Flor", 1100000],
        ["Tarjeta Edenred", 135000],
      ]),
      ...s("gasto", [
        ["Servicios + Impuestos", 1000000],
        ["Tarjetas de Crédito", 650000],
        ["Mercadopago TC", 3800000],
        ["Casa - Cuota Préstamo", 1550000],
        ["Casa - Deuda Franco", 750000],
        ["Sonia + Miriam", 100000],
      ]),
      ...s("reserva", [
        ["Ahorros", 100000],
        ["Fondo emergencia", 100000],
        ["Inversiones", 100000],
      ]),
    ];
  }

  // ---------- CARGA ----------
  async function load() {
    if (usaSupabase) {
      sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      const { data, error } = await sb
        .from("items").select("*").order("orden", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) {
        // primera vez: sembrar en la nube
        items = seed();
        await sb.from("items").insert(items);
      } else {
        items = data;
      }
    } else {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        try { items = JSON.parse(raw); }
        catch { items = seed(); saveLocal(); }
      } else {
        items = seed();
        saveLocal();
      }
    }
  }

  function saveLocal() {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }

  // ---------- LECTURA ----------
  function porCategoria(cat) {
    return items
      .filter(i => i.categoria === cat)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }

  function total(cat) {
    return porCategoria(cat).reduce((a, i) => a + (Number(i.monto) || 0), 0);
  }

  function balance() {
    return total("ingreso") - total("gasto") - total("reserva");
  }

  // ---------- ESCRITURA ----------
  async function add(categoria, nombre, monto) {
    const orden = porCategoria(categoria).length;
    const item = { id: uid(), categoria, nombre, monto: Number(monto) || 0, orden };
    items.push(item);
    if (usaSupabase) await sb.from("items").insert(item);
    else saveLocal();
    return item;
  }

  async function update(id, campos) {
    const it = items.find(i => i.id === id);
    if (!it) return;
    Object.assign(it, campos);
    if (usaSupabase) await sb.from("items").update(campos).eq("id", id);
    else saveLocal();
  }

  async function remove(id) {
    items = items.filter(i => i.id !== id);
    if (usaSupabase) await sb.from("items").delete().eq("id", id);
    else saveLocal();
  }

  return {
    usaSupabase, load,
    porCategoria, total, balance,
    add, update, remove
  };
})();
