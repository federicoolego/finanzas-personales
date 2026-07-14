// ===== Cliente Supabase =====
// Completá con tu URL y anon key después de correr sql/schema.sql en tu proyecto.
// La anon key es pública, va acá tranquilo (RLS protege la escritura).

const SUPABASE_URL      = "https://exufbmxwzrrklxiqgopy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BaihXY-vto6-OKhkpkbUaw_Y79cMCw7";

if (!window.supabase) {
  console.error("El SDK de Supabase no cargó. Revisá el <script> del CDN en index.html.");
} else if (SUPABASE_URL.includes("TU-PROYECTO")) {
  document.addEventListener("DOMContentLoaded", () => {
    const wrap = document.querySelector(".wrap");
    if (wrap) wrap.innerHTML = `
      <p class="empty">
        ⚠️ Supabase no está configurado.<br><br>
        Editá <code>js/supabase-client.js</code> con la URL y anon key de tu proyecto.<br>
        El esquema está en <code>sql/schema.sql</code>.
      </p>`;
  });
} else {
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
}
