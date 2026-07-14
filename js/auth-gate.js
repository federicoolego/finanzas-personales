// ===== Gate de autenticación =====
// Bloquea toda la app hasta que haya sesión Supabase.
// Debe cargarse DESPUÉS de supabase-client.js y ANTES de reservas.js / admin.js.

(function () {
  "use strict";

  if (!window.sb) {
    // supabase-client.js ya muestra un mensaje si no está configurado
    return;
  }

  const body = document.body;

  // Mostrar loader mientras resolvemos la sesión (evita flash de login)
  const loader = document.createElement("div");
  loader.id = "auth-gate-loader";
  loader.innerHTML = `<div class="auth-gate-spinner"></div>`;
  document.addEventListener("DOMContentLoaded", () => {
    if (!body.classList.contains("is-authed") && !document.getElementById("auth-gate")) {
      body.appendChild(loader);
    }
  });

  (async function boot() {
    const { data: { session } } = await window.sb.auth.getSession();

    if (session) {
      body.classList.add("is-authed");
      loader.remove();
      return;
    }

    // Sin sesión: montar pantalla de login
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mountGate);
    } else {
      mountGate();
    }
  })();

  function mountGate() {
    loader.remove();

    const gate = document.createElement("div");
    gate.id = "auth-gate";
    gate.innerHTML = `
      <div class="auth-gate-card">
        <div class="auth-gate-emoji">🔒</div>
        <h1 class="auth-gate-title">Reservas · Tenencia</h1>
        <p class="auth-gate-sub">Ingresá con tu usuario para ver el panel.</p>
        <form id="auth-gate-form" class="auth-gate-form">
          <label>Email
            <input type="email" name="email" required autocomplete="username" autofocus>
          </label>
          <label>Contraseña
            <input type="password" name="password" required autocomplete="current-password">
          </label>
          <p class="auth-gate-err" id="auth-gate-err" hidden></p>
          <button type="submit" class="auth-gate-btn">Entrar</button>
        </form>
        <p class="auth-gate-footer">Federico Olego</p>
      </div>
    `;
    document.body.appendChild(gate);

    gate.querySelector("#auth-gate-form").addEventListener("submit", handleLogin);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const err = document.getElementById("auth-gate-err");
    const btn = e.target.querySelector("button[type=submit]");
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Entrando…";

    const { error } = await window.sb.auth.signInWithPassword({
      email: (fd.get("email") || "").trim(),
      password: fd.get("password") || ""
    });

    if (error) {
      err.textContent = "Email o contraseña incorrectos.";
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = "Entrar";
      return;
    }

    // Recargamos para que reservas.js/admin.js arranquen limpio con la sesión
    location.reload();
  }

  // Si cierran sesión desde el menú admin, volver al gate
  window.sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      location.reload();
    }
  });
})();
