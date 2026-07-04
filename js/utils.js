// Utilidades compartidas

const fmtARS = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0
  }).format(n || 0);

// Parsea texto tipeado por el usuario a número (tolera "$", puntos de miles, comas)
function parseMonto(txt) {
  if (typeof txt === "number") return txt;
  if (!txt) return 0;
  const limpio = String(txt)
    .replace(/[^\d,.-]/g, "")   // saca $, espacios, letras
    .replace(/\./g, "")          // saca separador de miles
    .replace(",", ".");          // coma decimal -> punto
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
};

let toastTimer = null;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
