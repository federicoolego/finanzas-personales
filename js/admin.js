// ===== Módulo Administrador · Reservas (Supabase) =====
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const modalRoot = document.getElementById("admin-modal-root");
  const toggleBtn = document.getElementById("admin-toggle");
  const toggleIcon = toggleBtn && toggleBtn.querySelector(".admin-toggle-icon");
  const toggleLabel = toggleBtn && toggleBtn.querySelector(".admin-toggle-label");

  // ====================================================================
  //   Modal helpers
  // ====================================================================
  function closeModal() {
    modalRoot.innerHTML = "";
    document.body.classList.remove("admin-modal-open");
    document.removeEventListener("keydown", escToClose);
  }
  function openModal(html, opts = {}) {
    modalRoot.innerHTML = `
      <div class="admin-backdrop">
        <div class="admin-modal ${opts.wide ? "wide" : ""}" role="dialog" aria-modal="true">
          ${html}
        </div>
      </div>`;
    document.body.classList.add("admin-modal-open");
    modalRoot.querySelector(".admin-backdrop").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener("keydown", escToClose);
  }
  function escToClose(e) { if (e.key === "Escape") closeModal(); }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ====================================================================
  //   Guard: sin cliente Supabase, no hay admin
  // ====================================================================
  if (!window.sb) {
    console.warn("admin.js: cliente Supabase no configurado.");
    if (toggleBtn) toggleBtn.style.display = "none";
    return;
  }

  // ---------- Sesión ----------
  async function updateSessionUI() {
    const { data: { session } } = await window.sb.auth.getSession();
    const isAdmin = !!session;
    document.body.classList.toggle("is-admin", isAdmin);
    if (isAdmin) {
      toggleIcon.textContent = "🔓";
      const email = session.user.email || "";
      toggleLabel.textContent = email.split("@")[0] || "Admin";
      toggleBtn.title = `Sesión: ${email} · click para menú`;
    } else {
      toggleIcon.textContent = "🔒";
      toggleLabel.textContent = "Admin";
      toggleBtn.title = "Modo administrador";
    }
    // refrescar tabla para que los clicks de edición se enganchen
    if (typeof window.reloadReservas === "function") {
      // no recargar data, sólo re-renderizar filas con listener
      const btn = document.querySelector('[data-new="reserva"]');
      // truco: forzar re-render llamando reload (barato)
      // -- comentado: reload trae todo, con re-render local basta
    }
  }
  window.sb.auth.onAuthStateChange(() => { updateSessionUI(); });
  updateSessionUI();

  toggleBtn.addEventListener("click", async () => {
    const { data: { session } } = await window.sb.auth.getSession();
    if (session) openAdminMenu(session.user.email);
    else openLoginModal();
  });

  // ---------- Login ----------
  function openLoginModal() {
    openModal(`
      <h2 class="admin-title">Iniciar sesión</h2>
      <p class="admin-sub">Ingresá con tu usuario admin de Supabase.</p>
      <form id="admin-login-form" class="admin-form">
        <label>Email
          <input type="email" name="email" required autocomplete="username" autofocus>
        </label>
        <label>Contraseña
          <input type="password" name="password" required autocomplete="current-password">
        </label>
        <p class="admin-err" id="admin-login-err" hidden></p>
        <div class="admin-actions">
          <button type="button" class="admin-btn ghost" data-close>Cancelar</button>
          <button type="submit" class="admin-btn primary">Entrar</button>
        </div>
      </form>
    `);
    $("#admin-login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const err = $("#admin-login-err");
      err.hidden = true;
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = "Entrando…";
      const { error } = await window.sb.auth.signInWithPassword({
        email: fd.get("email"), password: fd.get("password")
      });
      if (error) {
        err.textContent = "No se pudo iniciar sesión. Revisá email y contraseña.";
        err.hidden = false;
        btn.disabled = false; btn.textContent = "Entrar";
        return;
      }
      closeModal();
    });
    modalRoot.querySelector("[data-close]").addEventListener("click", closeModal);
  }

  function openAdminMenu(email) {
    openModal(`
      <h2 class="admin-title">Modo administrador</h2>
      <p class="admin-sub">Sesión activa como <strong>${escapeHtml(email)}</strong>.</p>
      <p class="admin-hint">Con la sesión abierta podés:</p>
      <ul class="admin-list">
        <li>Usar el botón <strong>➕ Nueva carga</strong> arriba.</li>
        <li>Click en cualquier <strong>fila de la tabla</strong> para editar o eliminar.</li>
        <li>Gestionar el <strong>catálogo de reservas</strong> (agregar / renombrar).</li>
      </ul>
      <div class="admin-actions with-delete">
        <button type="button" class="admin-btn danger" id="admin-logout">Cerrar sesión</button>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" class="admin-btn ghost" id="admin-open-catalog">⚙️ Reservas</button>
          <button type="button" class="admin-btn primary" data-close>Listo</button>
        </div>
      </div>
    `);
    modalRoot.querySelector("[data-close]").addEventListener("click", closeModal);
    $("#admin-logout").addEventListener("click", async () => {
      await window.sb.auth.signOut();
      closeModal();
    });
    $("#admin-open-catalog").addEventListener("click", () => openCatalogModal());
  }

  // ====================================================================
  //   Catálogo de reservas: cache + CRUD
  // ====================================================================
  let catalogCache = null;

  async function ensureCatalog() {
    if (catalogCache) return catalogCache;
    const { data, error } = await window.sb
      .from("reservas_catalogo").select("id, nombre, orden").order("orden").order("nombre");
    if (error) throw new Error("No se pudo cargar reservas_catalogo: " + error.message);
    catalogCache = data || [];
    return catalogCache;
  }

  async function createCatalogItem(nombre, orden) {
    const clean = nombre.trim();
    if (!clean) throw new Error("El nombre no puede estar vacío.");
    const { data, error } = await window.sb
      .from("reservas_catalogo")
      .insert({ nombre: clean, orden: Number(orden) || 100 })
      .select("id, nombre, orden").single();
    if (error) {
      if (error.code === "23505") throw new Error(`"${clean}" ya existe.`);
      throw new Error(error.message);
    }
    catalogCache.push(data);
    catalogCache.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
    return data;
  }
  async function updateCatalogItem(id, nombre, orden) {
    const clean = nombre.trim();
    if (!clean) throw new Error("El nombre no puede estar vacío.");
    const { data, error } = await window.sb
      .from("reservas_catalogo")
      .update({ nombre: clean, orden: Number(orden) || 100 })
      .eq("id", id).select("id, nombre, orden").single();
    if (error) {
      if (error.code === "23505") throw new Error(`"${clean}" ya existe.`);
      throw new Error(error.message);
    }
    const idx = catalogCache.findIndex(x => x.id === id);
    if (idx >= 0) catalogCache[idx] = data;
    catalogCache.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
    return data;
  }
  async function deleteCatalogItem(id) {
    const { error } = await window.sb.from("reservas_catalogo").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") throw new Error("No se puede eliminar: hay cargas asociadas.");
      throw new Error(error.message);
    }
    catalogCache = catalogCache.filter(x => x.id !== id);
  }

  async function openCatalogModal() {
    try { await ensureCatalog(); }
    catch (e) { alert(e.message); return; }

    // View con contador de uso
    const { data: withUso } = await window.sb
      .from("reservas_catalogo_con_uso").select("*");
    const usoMap = new Map((withUso || []).map(x => [x.id, x.uso]));

    openModal(`
      <h2 class="admin-title">⚙️ Catálogo de reservas</h2>
      <p class="admin-sub">Agregá, renombrá o borrá los tipos de reserva.</p>
      <div class="catalog-list" id="cat-list">${renderCatalogList(usoMap)}</div>
      <hr class="admin-sep">
      <form id="cat-form" class="admin-form">
        <div class="admin-form-row">
          <label style="flex:2">Nueva reserva
            <input type="text" name="nombre" required placeholder="Ej: Fondo Vivienda">
          </label>
          <label style="flex:1">Orden
            <input type="number" name="orden" value="100" min="0" max="9999">
          </label>
        </div>
        <p class="admin-err" id="cat-err" hidden></p>
        <div class="admin-actions">
          <button type="button" class="admin-btn ghost" data-close>Cerrar</button>
          <button type="submit" class="admin-btn primary">➕ Agregar</button>
        </div>
      </form>
    `, { wide: true });

    modalRoot.querySelector("[data-close]").addEventListener("click", closeModal);
    bindCatalogListEvents(usoMap);

    $("#cat-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const err = $("#cat-err"); err.hidden = true;
      try {
        await createCatalogItem(fd.get("nombre"), fd.get("orden"));
        // recargar view con uso
        const { data: fresh } = await window.sb.from("reservas_catalogo_con_uso").select("*");
        const freshMap = new Map((fresh || []).map(x => [x.id, x.uso]));
        $("#cat-list").innerHTML = renderCatalogList(freshMap);
        bindCatalogListEvents(freshMap);
        e.target.reset(); e.target.querySelector('input[name="orden"]').value = "100";
      } catch (er) {
        err.textContent = er.message;
        err.hidden = false;
      }
    });
  }

  function renderCatalogList(usoMap) {
    if (!catalogCache.length) return `<p class="empty">Sin reservas cargadas todavía.</p>`;
    return catalogCache.map(c => {
      const uso = usoMap.get(c.id) || 0;
      return `
        <div class="catalog-item" data-id="${c.id}">
          <div class="catalog-main">
            <input type="text" class="catalog-nombre" value="${escapeHtml(c.nombre)}">
            <input type="number" class="catalog-orden" value="${c.orden}" min="0" max="9999" title="Orden">
          </div>
          <div class="catalog-meta">
            <span class="catalog-uso" title="Cargas asociadas">${uso} carga${uso === 1 ? "" : "s"}</span>
            <button type="button" class="admin-btn small primary" data-act="save">Guardar</button>
            <button type="button" class="admin-btn small danger" data-act="del" ${uso > 0 ? "disabled title=\"Con cargas, no se puede borrar\"" : ""}>🗑</button>
          </div>
        </div>`;
    }).join("");
  }

  function bindCatalogListEvents(usoMap) {
    modalRoot.querySelectorAll(".catalog-item").forEach(row => {
      const id = Number(row.getAttribute("data-id"));
      row.querySelector('[data-act="save"]').addEventListener("click", async () => {
        const nombre = row.querySelector(".catalog-nombre").value;
        const orden  = row.querySelector(".catalog-orden").value;
        try {
          await updateCatalogItem(id, nombre, orden);
          if (typeof window.reloadReservas === "function") await window.reloadReservas();
        } catch (e) { alert(e.message); }
      });
      row.querySelector('[data-act="del"]').addEventListener("click", async () => {
        if (!confirm("¿Borrar esta reserva del catálogo?")) return;
        try {
          await deleteCatalogItem(id);
          row.remove();
          if (typeof window.reloadReservas === "function") await window.reloadReservas();
        } catch (e) { alert(e.message); }
      });
    });
  }

  // ====================================================================
  //   CRUD de cargas (reservas)
  // ====================================================================
  function todayISO() {
    const d = new Date();
    // ISO local (no UTC) para evitar corrimiento por timezone
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  async function openReservaForm(row) {
    try { await ensureCatalog(); }
    catch (e) { alert(e.message); return; }
    const isEdit = !!row;

    // Buscar reserva_id a partir del nombre (row viene de la view aplanada)
    let initialReservaId = "";
    if (isEdit) {
      const found = catalogCache.find(c => c.nombre === row.reserva);
      if (found) initialReservaId = String(found.id);
    }

    const catOpts = catalogCache
      .map(c => `<option value="${c.id}" ${String(c.id) === initialReservaId ? "selected" : ""}>${escapeHtml(c.nombre)}</option>`)
      .join("");

    openModal(`
      <h2 class="admin-title">${isEdit ? "✏️ Editar carga" : "➕ Nueva carga"}</h2>
      <p class="admin-sub">${isEdit
        ? "Modificá los datos y guardá los cambios."
        : "Registrá el saldo total de una reserva a fin de mes."}</p>
      <form id="reserva-form" class="admin-form">
        <div class="admin-form-row">
          <label style="flex:1">Fecha
            <input type="date" name="fecha" required value="${isEdit ? row.fecha : todayISO()}" max="${todayISO()}">
          </label>
          <label style="flex:1">Moneda
            <select name="moneda" required>
              <option value="ARS" ${isEdit && row.moneda === "ARS" ? "selected" : ""}>$ Pesos (ARS)</option>
              <option value="USD" ${isEdit && row.moneda === "USD" ? "selected" : ""}>US$ Dólares (USD)</option>
            </select>
          </label>
        </div>
        <label>Reserva
          <select name="reserva_id" required>
            <option value="" disabled ${!isEdit ? "selected" : ""}>Elegí una…</option>
            ${catOpts}
          </select>
        </label>
        <label>Monto
          <input type="number" name="monto" required min="0" step="0.01" value="${isEdit ? row.monto : ""}" placeholder="0.00">
        </label>
        <label>Nota (opcional)
          <input type="text" name="nota" maxlength="200" value="${isEdit ? escapeHtml(row.nota || "") : ""}" placeholder="Ej: aporte extra por bono">
        </label>
        <p class="admin-hint">💡 Si ya existe una carga para esta reserva, moneda y mes, se actualiza (upsert por año-mes).</p>
        <p class="admin-err" id="reserva-err" hidden></p>
        <div class="admin-actions with-delete">
          ${isEdit ? `<button type="button" class="admin-btn danger" id="reserva-del">🗑 Eliminar</button>` : `<span></span>`}
          <div style="display:flex; gap:10px;">
            <button type="button" class="admin-btn ghost" data-close>Cancelar</button>
            <button type="submit" class="admin-btn primary">${isEdit ? "Guardar" : "Crear"}</button>
          </div>
        </div>
      </form>
    `);
    modalRoot.querySelector("[data-close]").addEventListener("click", closeModal);

    if (isEdit) {
      $("#reserva-del").addEventListener("click", async () => {
        if (!confirm("¿Eliminar esta carga? No se puede deshacer.")) return;
        const { error } = await window.sb.from("reservas").delete().eq("id", row.id);
        if (error) { alert("Error al eliminar: " + error.message); return; }
        closeModal();
        if (typeof window.reloadReservas === "function") await window.reloadReservas();
      });
    }

    $("#reserva-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const err = $("#reserva-err"); err.hidden = true;
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = "Guardando…";

      const payload = {
        fecha: fd.get("fecha"),
        reserva_id: Number(fd.get("reserva_id")),
        moneda: fd.get("moneda"),
        monto: Number(fd.get("monto")),
        nota: (fd.get("nota") || "").trim() || null
      };

      try {
        if (isEdit) {
          const { error } = await window.sb.from("reservas").update(payload).eq("id", row.id);
          if (error) throw error;
        } else {
          // Upsert por (reserva_id, moneda, anio, mes) — anio/mes son generated,
          // así que Postgres los calcula. Usamos onConflict manual con la unique.
          const { error } = await window.sb
            .from("reservas")
            .upsert(payload, { onConflict: "reserva_id,moneda,anio,mes" });
          if (error) throw error;
        }
        closeModal();
        if (typeof window.reloadReservas === "function") await window.reloadReservas();
      } catch (er) {
        err.textContent = "Error: " + (er.message || er);
        err.hidden = false;
        btn.disabled = false; btn.textContent = isEdit ? "Guardar" : "Crear";
      }
    });
  }

  // Wire "Nueva carga" button en el header (admin-only)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-new="reserva"]');
    if (btn) openReservaForm(null);
  });

  // Exponer para que reservas.js dispare edit al clickear una fila
  window.openEditReserva = (row) => openReservaForm(row);

})();