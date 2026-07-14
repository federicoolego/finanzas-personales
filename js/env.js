// ===== Data loader (Supabase) =====
// Lee de la view aplanada `reservas_view`. La escritura contra la tabla base
// la maneja admin.js. Este archivo se carga ANTES que supabase-client.js.

(function () {
  const READ_TABLE = {
    reservas: "reservas_view"
  };

  window.APP_ENV = {
    async loadTable(name) {
      if (!window.sb) {
        throw new Error("Cliente Supabase no inicializado. Revisá js/supabase-client.js.");
      }
      const source = READ_TABLE[name] || name;
      const { data, error } = await window.sb
        .from(source)
        .select("*")
        .order("fecha", { ascending: true });
      if (error) throw error;
      return data || [];
    }
  };
})();
