// ===== Módulo Administrador · Reservas (Supabase) =====
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const modalRoot = document.getElementById("admin-modal-root");
  const toggleBtn = document.getElementById("admin-toggle");
  const toggleIcon = toggleBtn && toggleBtn.querySelector(".admin-toggle-icon");
  const toggleLabel = toggleBtn && toggleBtn.querySelector(".admin-toggle-label");

  // Nuevos elementos: toggle Solo lectura / Edición y FAB WhatsApp
  const modeBtn   = document.getElementById("mode-toggle");
  const modeIcon  = modeBtn && modeBtn.querySelector(".mode-toggle-icon");
  const modeLabel = modeBtn && modeBtn.querySelector(".mode-toggle-label");
  const waFab     = document.getElementById("wa-share-fab");

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
    if (modeBtn)   modeBtn.style.display = "none";
    if (waFab)     waFab.style.display = "none";
    return;
  }

  // ====================================================================
  //   Sesión + modos (solo lectura / edición)
  // ====================================================================
  // Reglas:
  //  - Sin sesión: sin `is-authed`, sin `is-admin`. Se ve el botón "Admin" para login.
  //  - Con sesión: `is-authed` = TRUE. Por defecto NO se activa `is-admin` (modo solo lectura).
  //  - Botón `#mode-toggle` alterna `is-admin` para pasar a modo edición y volver.
  //  - Al SIGNED_OUT: se quita `is-admin` también.
  function applyModeUI() {
    const editing = document.body.classList.contains("is-admin");
    if (!modeBtn) return;
    if (editing) {
      modeIcon.textContent = "✏️";
      modeLabel.textContent = "Edición";
      modeBtn.classList.add("editing");
      modeBtn.title = "Modo edición activo · click para volver a solo lectura";
    } else {
      modeIcon.textContent = "👁";
      modeLabel.textContent = "Solo lectura";
      modeBtn.classList.remove("editing");
      modeBtn.title = "Modo solo lectura · click para editar";
    }
  }

  async function updateSessionUI() {
    const { data: { session } } = await window.sb.auth.getSession();
    const authed = !!session;
    document.body.classList.toggle("is-authed", authed);

    if (!authed) {
      // Al perder sesión, salir de edición
      document.body.classList.remove("is-admin");
    }

    if (authed) {
      toggleIcon.textContent = "🔓";
      const email = session.user.email || "";
      toggleLabel.textContent = email.split("@")[0] || "Admin";
      toggleBtn.title = `Sesión: ${email} · click para menú`;
    } else {
      toggleIcon.textContent = "🔒";
      toggleLabel.textContent = "Admin";
      toggleBtn.title = "Modo administrador";
    }
    applyModeUI();
  }
  window.sb.auth.onAuthStateChange(() => { updateSessionUI(); });
  updateSessionUI();

  toggleBtn.addEventListener("click", async () => {
    const { data: { session } } = await window.sb.auth.getSession();
    if (session) openAdminMenu(session.user.email);
    else openLoginModal();
  });

  // Toggle Solo lectura / Edición
  if (modeBtn) {
    modeBtn.addEventListener("click", async () => {
      const { data: { session } } = await window.sb.auth.getSession();
      if (!session) return; // por si acaso
      const nowEditing = !document.body.classList.contains("is-admin");
      document.body.classList.toggle("is-admin", nowEditing);
      applyModeUI();
      // Re-render de la tabla para enganchar/soltar el click de edición en filas
      if (typeof window.reloadReservas === "function") {
        await window.reloadReservas();
      }
    });
  }

  // ====================================================================
  //   FAB WhatsApp: capturar KPIs (con filtros) y compartir
  // ====================================================================
  function readFiltersSummary() {
    const anio    = (document.querySelector("#combo-anio .combo-input")   || {}).value || "";
    const mes     = (document.querySelector("#combo-mes .combo-input")    || {}).value || "";
    const reserva = (document.querySelector("#combo-reserva .combo-input")|| {}).value || "";
    const lastN   = (document.getElementById("last-n") || {}).value || "";
    const parts = [];
    if (anio && anio.toLowerCase() !== "todos")   parts.push(`Año: ${anio}`);
    if (mes  && mes.toLowerCase()  !== "todos")   parts.push(`Mes: ${mes}`);
    if (reserva && reserva.toLowerCase() !== "todas") parts.push(`Reserva: ${reserva}`);
    if (lastN) parts.push(`Últimos ${lastN} meses`);
    return parts.length ? parts.join(" · ") : "Sin filtros aplicados (vista total)";
  }

  function txt(id) {
    const el = document.getElementById(id);
    return el ? (el.textContent || "").trim() : "";
  }

  function buildShareCard() {
    const filtros = readFiltersSummary();
    const now = new Date();
    const fecha = now.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

    const kpiRow = (title, valId, subId, tone) => `
      <div class="wa-kpi ${tone}">
        <div class="wa-kpi-label">${title}</div>
        <div class="wa-kpi-value">${escapeHtml(txt(valId) || "–")}</div>
        <div class="wa-kpi-sub">${escapeHtml(txt(subId))}</div>
      </div>`;

    const card = document.createElement("div");
    card.className = "wa-share-card";
    card.innerHTML = `
      <div class="wa-header">
        <div class="wa-eyebrow">Tenencia total</div>
        <div class="wa-title">Mis Reservas en el Tiempo</div>
        <div class="wa-owner">Federico Olego · ${fecha}</div>
        <div class="wa-filters">🔎 ${escapeHtml(filtros)}</div>
      </div>

      <div class="wa-section">
        <div class="wa-section-title"><span class="wa-badge ars">$ ARS</span> Tenencia en Pesos</div>
        <div class="wa-kpis">
          ${kpiRow("Tenencia actual",   "kpi-ars-total",    "kpi-ars-total-sub",    "hi")}
          ${kpiRow("Variación mes",     "kpi-ars-var-mes",  "kpi-ars-var-mes-sub",  "")}
          ${kpiRow("Variación año",     "kpi-ars-var-anio", "kpi-ars-var-anio-sub", "")}
          ${kpiRow("Máximo histórico",  "kpi-ars-max",      "kpi-ars-max-sub",      "")}
          ${kpiRow("Meses con carga",   "kpi-ars-meses",    "kpi-ars-meses-sub",    "")}
        </div>
      </div>

      <div class="wa-section">
        <div class="wa-section-title"><span class="wa-badge usd">US$</span> Tenencia en Dólares</div>
        <div class="wa-kpis">
          ${kpiRow("Tenencia actual",   "kpi-usd-total",    "kpi-usd-total-sub",    "hi")}
          ${kpiRow("Variación mes",     "kpi-usd-var-mes",  "kpi-usd-var-mes-sub",  "")}
          ${kpiRow("Variación año",     "kpi-usd-var-anio", "kpi-usd-var-anio-sub", "")}
          ${kpiRow("Máximo histórico",  "kpi-usd-max",      "kpi-usd-max-sub",      "")}
          ${kpiRow("Meses con carga",   "kpi-usd-meses",    "kpi-usd-meses-sub",    "")}
        </div>
      </div>

      <div class="wa-footer">Reservas · Tenencia en el tiempo</div>
    `;
    return card;
  }

  async function shareKPIsWhatsApp() {
    if (typeof window.html2canvas !== "function") {
      alert("No se pudo cargar el motor de captura (html2canvas). Revisá la conexión.");
      return;
    }
    // Feedback visual
    waFab.classList.add("loading");
    waFab.disabled = true;

    const card = buildShareCard();
    document.body.appendChild(card);

    try {
      const canvas = await window.html2canvas(card, {
        backgroundColor: "#0d1117",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: card.scrollWidth,
        windowHeight: card.scrollHeight
      });

      await new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) { resolve(); return; }
          const filename = `reservas-kpis-${new Date().toISOString().slice(0,10)}.png`;
          const file = new File([blob], filename, { type: "image/png" });
          const filtros = readFiltersSummary();
          const shareText = `📊 Mis Reservas · ${filtros}`;

          // 1) Web Share API con archivo (móvil moderno)
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: "Mis Reservas",
                text: shareText
              });
              resolve();
              return;
            }
          } catch (_) { /* usuario canceló o no soportado */ }

          // 2) Fallback: descargar imagen + abrir WhatsApp con texto
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1500);

          const waMsg = encodeURIComponent(`${shareText}\n(La imagen quedó descargada, adjuntala en el chat)`);
          window.open(`https://wa.me/?text=${waMsg}`, "_blank", "noopener");
          resolve();
        }, "image/png");
      });
    } catch (e) {
      console.error(e);
      alert("No se pudo generar la imagen: " + (e.message || e));
    } finally {
      card.remove();
      waFab.classList.remove("loading");
      waFab.disabled = false;
    }
  }

  if (waFab) waFab.addEventListener("click", shareKPIsWhatsApp);

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
    const editing = document.body.classList.contains("is-admin");
    openModal(`
      <h2 class="admin-title">Modo administrador</h2>
      <p class="admin-sub">Sesión activa como <strong>${escapeHtml(email)}</strong>.</p>
      <p class="admin-hint">
        Estado actual: <strong>${editing ? "✏️ Edición" : "👁 Solo lectura"}</strong>.
        Usá el botón <em>Solo lectura / Edición</em> del encabezado para cambiar de modo.
      </p>
      <ul class="admin-list">
        <li>En modo edición podés usar <strong>➕ Nueva carga</strong>.</li>
        <li>Click en cualquier <strong>fila de la tabla</strong> para editar o eliminar (solo en edición).</li>
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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  async function openReservaForm(row) {
    // Bloqueo si no está en modo edición
    if (!document.body.classList.contains("is-admin")) {
      alert("Estás en modo solo lectura. Cambiá a modo edición para modificar registros.");
      return;
    }
    try { await ensureCatalog(); }
    catch (e) { alert(e.message); return; }
    const isEdit = !!row;

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