// ============================================================
//  WHATSAPP — botón flotante draggable + compartir resumen PNG
// ============================================================

(function () {
  const POS_KEY = "cf_wa_fab_pos_v1";
  const MARGIN = 12;      // margen mínimo contra los bordes del viewport
  const DRAG_THRESHOLD = 6; // px que hay que moverse para que sea "drag" y no "tap"

  // ---------- Crear el botón ----------
  const fab = document.createElement("button");
  fab.className = "wa-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Compartir resumen por WhatsApp");
  fab.title = "Compartir resumen por WhatsApp (arrastrable)";
  fab.innerHTML = `
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <path fill="currentColor" d="M19.11 17.35c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.64-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.06 2.88 1.21 3.08.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.22 1.35.19 1.86.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM16.03 5.33c-5.92 0-10.72 4.8-10.72 10.72 0 1.89.5 3.74 1.44 5.36l-1.53 5.58 5.72-1.5c1.57.86 3.33 1.31 5.09 1.31 5.92 0 10.72-4.8 10.72-10.72s-4.8-10.75-10.72-10.75zm0 19.63c-1.59 0-3.15-.42-4.51-1.24l-.32-.19-3.4.89.91-3.31-.21-.34c-.9-1.43-1.37-3.07-1.37-4.75 0-4.92 4.01-8.93 8.93-8.93 2.38 0 4.62.93 6.31 2.61 1.68 1.69 2.61 3.93 2.61 6.31-.02 4.92-4.03 8.95-8.95 8.95z"/>
    </svg>
  `;
  document.body.appendChild(fab);

  // ---------- Posicionamiento ----------
  function loadPos() {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    } catch (_) {}
    return null;
  }
  function savePos(x, y) {
    try { localStorage.setItem(POS_KEY, JSON.stringify({ x, y })); } catch (_) {}
  }
  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
  function applyPos(x, y) {
    const r = fab.getBoundingClientRect();
    const w = r.width || 60, h = r.height || 60;
    x = clamp(x, MARGIN, window.innerWidth  - w - MARGIN);
    y = clamp(y, MARGIN, window.innerHeight - h - MARGIN);
    fab.style.left = x + "px";
    fab.style.top  = y + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";
    return { x, y };
  }

  // Posición inicial: guardada o por defecto (abajo-derecha)
  function initPos() {
    const saved = loadPos();
    const r = fab.getBoundingClientRect();
    const w = r.width || 60, h = r.height || 60;
    if (saved) return applyPos(saved.x, saved.y);
    return applyPos(window.innerWidth - w - 24, window.innerHeight - h - 24);
  }
  // Esperar al primer frame para conocer el tamaño real
  requestAnimationFrame(initPos);

  // Re-clampear si cambia el tamaño de la ventana
  window.addEventListener("resize", () => {
    const r = fab.getBoundingClientRect();
    applyPos(r.left, r.top);
  });

  // ---------- Drag con pointer events ----------
  let dragging = false;
  let moved = false;
  let startX = 0, startY = 0;
  let offX = 0, offY = 0;

  fab.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = false;
    const r = fab.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    offX = e.clientX - r.left;
    offY = e.clientY - r.top;
    fab.setPointerCapture(e.pointerId);
    fab.classList.add("dragging");
  });

  fab.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) moved = true;
    if (moved) applyPos(e.clientX - offX, e.clientY - offY);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    fab.classList.remove("dragging");
    try { fab.releasePointerCapture(e.pointerId); } catch (_) {}
    if (moved) {
      const r = fab.getBoundingClientRect();
      savePos(r.left, r.top);
    }
  }
  fab.addEventListener("pointerup", endDrag);
  fab.addEventListener("pointercancel", endDrag);

  // Suprimir el click si hubo drag
  fab.addEventListener("click", (e) => {
    if (moved) { e.preventDefault(); e.stopImmediatePropagation(); moved = false; return; }
    shareResumen();
  });

  // ---------- Generar imagen del resumen ----------
  function fmtARS(n) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);
  }

  function generarResumenPNG() {
    const ing = Store.total("ingreso");
    const gas = Store.total("gasto");
    const res = Store.total("reserva");
    const bal = ing - gas - res;
    const neg = bal < 0;

    // Alta resolución (DPR) para que se vea nítido en el chat
    const W = 900, H = 1100;
    const dpr = Math.max(2, window.devicePixelRatio || 1);
    const canvas = document.createElement("canvas");
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    // Fondo con degradés (imitando el body de la app)
    const g1 = ctx.createRadialGradient(W * 0.2, -50, 0, W * 0.2, -50, 800);
    g1.addColorStop(0, "#241f38"); g1.addColorStop(1, "#12101c");
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(W, 0, 0, W, 0, 700);
    g2.addColorStop(0, "rgba(28,40,54,.85)"); g2.addColorStop(1, "rgba(28,40,54,0)");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = "#a78bfa";
    ctx.beginPath(); ctx.arc(70, 90, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ece9f5";
    ctx.font = "700 40px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText("Calculadora Familiar", 100, 100);
    ctx.fillStyle = "#9a92b5";
    ctx.font = "500 22px 'Inter', system-ui, sans-serif";
    const mesLabel = (window.MonthLabel && window.MonthLabel.label) || new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
    ctx.fillText("Resumen · " + mesLabel, 100, 135);

    // Bloques de totales
    const bloques = [
      { titulo: "Ingresos",     signo: "+", valor: ing, color: "#4ade80", bg: "#1e3a2b" },
      { titulo: "Gastos Fijos", signo: "−", valor: gas, color: "#fb7185", bg: "#3a1f28" },
      { titulo: "Reservas",     signo: "−", valor: res, color: "#fbbf24", bg: "#3a2f14" },
    ];

    let y = 200;
    for (const b of bloques) {
      // Fondo del bloque
      roundRect(ctx, 50, y, W - 100, 130, 20);
      ctx.fillStyle = "#201c30"; ctx.fill();
      // Barra de color
      roundRect(ctx, 50, y, 8, 130, 4);
      ctx.fillStyle = b.color; ctx.fill();

      ctx.fillStyle = "#9a92b5";
      ctx.font = "600 24px 'Inter', system-ui, sans-serif";
      ctx.fillText(b.titulo.toUpperCase(), 90, y + 45);

      ctx.fillStyle = b.color;
      ctx.font = "700 26px 'JetBrains Mono', monospace";
      ctx.fillText(b.signo, 90, y + 95);

      ctx.fillStyle = "#ece9f5";
      ctx.font = "700 44px 'JetBrains Mono', monospace";
      const txt = fmtARS(b.valor);
      const tw = ctx.measureText(txt).width;
      ctx.fillText(txt, W - 70 - tw, y + 97);

      y += 155;
    }

    // Separador de cuenta
    y += 10;
    ctx.strokeStyle = "#322c47"; ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(W - 60, y); ctx.stroke();
    ctx.setLineDash([]);

    // Resultado
    y += 40;
    const resColor = neg ? "#fb7185" : "#4ade80";
    const resBg    = neg ? "#3a1f28" : "#1e3a2b";
    roundRect(ctx, 50, y, W - 100, 220, 24);
    ctx.fillStyle = resBg; ctx.fill();
    ctx.strokeStyle = resColor; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = "#9a92b5";
    ctx.font = "600 22px 'Inter', system-ui, sans-serif";
    ctx.fillText(neg ? "TE FALTAN" : "TE QUEDA DISPONIBLE", 80, y + 70);

    ctx.fillStyle = resColor;
    ctx.font = "700 78px 'JetBrains Mono', monospace";
    ctx.fillText(fmtARS(bal), 80, y + 165);

    // Footer
    ctx.fillStyle = "#9a92b5";
    ctx.font = "500 18px 'Inter', system-ui, sans-serif";
    const foot = "Ingresos − Gastos Fijos − Reservas = Disponible";
    const fw = ctx.measureText(foot).width;
    ctx.fillText(foot, (W - fw) / 2, H - 40);

    return new Promise((resolve) => canvas.toBlob((b) => resolve({ blob: b, resumen: { ing, gas, res, bal, neg } }), "image/png"));
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
  }

  function textoResumen({ ing, gas, res, bal, neg }) {
    const mesLabel = (window.MonthLabel && window.MonthLabel.label) || new Date().toLocaleDateString("es-AR");
    return [
      "*Calculadora Familiar*",
      "Resumen · " + mesLabel,
      "",
      "➕ Ingresos: " + fmtARS(ing),
      "➖ Gastos Fijos: " + fmtARS(gas),
      "➖ Reservas: " + fmtARS(res),
      "",
      (neg ? "🔴 Te faltan: " : "🟢 Te queda disponible: ") + fmtARS(bal),
    ].join("\n");
  }

  // ---------- Compartir ----------
  async function shareResumen() {
    fab.classList.add("loading");
    try {
      const { blob, resumen } = await generarResumenPNG();
      const file = new File([blob], "resumen-familiar.png", { type: "image/png" });
      const texto = textoResumen(resumen);

      // Web Share API con archivo (móvil moderno: Android/iOS)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: texto, title: "Resumen familiar" });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return; // el usuario canceló
          // si falla, sigue al fallback
        }
      }

      // Fallback: descarga el PNG + abre WhatsApp Web con el texto
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "resumen-familiar.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      // Abrir WhatsApp: en desktop cae a WhatsApp Web, en mobile abre la app
      const waUrl = "https://wa.me/?text=" + encodeURIComponent(texto);
      window.open(waUrl, "_blank", "noopener");
      toast("Imagen descargada. Adjuntala en el chat de WhatsApp.");
    } catch (err) {
      console.error(err);
      toast("No se pudo generar el resumen: " + err.message);
    } finally {
      fab.classList.remove("loading");
    }
  }
})();
