// ================= SUPABASE =================
const SUPABASE_URL  = "https://rcusuuyakezwrwlpqiby.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdXN1dXlha2V6d3J3bHBxaWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM3ODIsImV4cCI6MjA5MDEzOTc4Mn0.gjWgUR-JTsQ06JW5u36XgxRAux8-dN2Huz_lf9kvks4";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ================= AUTH =================
async function login() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl    = document.getElementById("login-error");
  errEl.style.display = "none";

  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    errEl.style.display = "block";
    return;
  }

  mostrarPanel();
}

async function logout() {
  await sb.auth.signOut();
  document.getElementById("admin-panel").style.display = "none";
  document.getElementById("login-screen").style.display = "flex";
}

async function checkSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    mostrarPanel();
  }
}

function mostrarPanel() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-panel").style.display  = "block";
  cargarVentas();
}

document.addEventListener("DOMContentLoaded", checkSession);

// Permitir login con Enter
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.getElementById("login-screen").style.display !== "none") {
    login();
  }
});

// ================= NAVEGACIÓN =================
function showPage(page, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));

  const target = document.getElementById("page-" + page);
  if (target) target.classList.add("active");
  if (btn) btn.classList.add("active");

  if (page === "ventas")   cargarVentas();
  if (page === "clientes") cargarClientes();
  if (page === "stock")    cargarStock();
  if (page === "codigos")  cargarCodigos();
}

// ================= VENTAS =================
let todasLasVentas = [];

async function cargarVentas() {
  const { data, error } = await sb
    .from("ventas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { mostrarToast("Error cargando ventas"); return; }

  todasLasVentas = data || [];
  renderVentasStats(todasLasVentas);
  renderVentasTabla(todasLasVentas);
}

function renderVentasStats(ventas) {
  const total     = ventas.reduce((s, v) => s + Number(v.total), 0);
  const conDescuento = ventas.filter(v => v.descuento_socio).length;
  const tarjeta   = ventas.filter(v => v.metodo_pago === "tarjeta").length;
  const mp        = ventas.filter(v => v.metodo_pago === "mercadopago").length;

  document.getElementById("ventas-stats").innerHTML = `
    <div class="stat-card">
      <div class="label">Total ventas</div>
      <div class="value">${ventas.length}</div>
    </div>
    <div class="stat-card">
      <div class="label">Recaudado</div>
      <div class="value">$${total.toLocaleString("es-AR")}</div>
    </div>
    <div class="stat-card">
      <div class="label">Con descuento socio</div>
      <div class="value">${conDescuento}</div>
    </div>
    <div class="stat-card">
      <div class="label">Tarjeta / MP</div>
      <div class="value">${tarjeta} / ${mp}</div>
    </div>
  `;
}

function renderVentasTabla(ventas) {
  const tbody = document.getElementById("ventas-tbody");
  if (!ventas.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">💳</div><p>Sin ventas</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = ventas.map(v => `
    <tr>
      <td>${new Date(v.created_at).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })}</td>
      <td>${v.nombre_cliente || "Anónimo"}</td>
      <td>${v.email_cliente  || "—"}</td>
      <td>${v.dni_cliente    || "—"}</td>
      <td>${v.tel_cliente    || "—"}</td>
      <td><strong>$${Number(v.total).toLocaleString("es-AR")}</strong></td>
      <td><span class="badge badge-${v.metodo_pago}">${v.metodo_pago}</span></td>
      <td>${v.descuento_socio ? "✅" : "—"}</td>
    </tr>
  `).join("");
}

function filtrarVentas(q) {
  const filtradas = todasLasVentas.filter(v =>
    (v.nombre_cliente || "").toLowerCase().includes(q.toLowerCase()) ||
    (v.email_cliente  || "").toLowerCase().includes(q.toLowerCase()) ||
    (v.dni_cliente    || "").toLowerCase().includes(q.toLowerCase())
  );
  renderVentasTabla(filtradas);
}

// ================= CLIENTES =================
let todosLosClientes = [];

async function cargarClientes() {
  const { data, error } = await sb
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { mostrarToast("Error cargando clientes"); return; }

  todosLosClientes = data || [];
  renderClientesTabla(todosLosClientes);
}

function renderClientesTabla(clientes) {
  const tbody = document.getElementById("clientes-tbody");
  if (!clientes.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="icon">👥</div><p>Sin clientes</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = clientes.map(c => `
    <tr>
      <td>${c.nombre}</td>
      <td>${c.email    || "—"}</td>
      <td>${c.telefono || "—"}</td>
      <td>${new Date(c.created_at).toLocaleDateString("es-AR")}</td>
      <td>
        <button class="btn-action btn-edit"   onclick='editarCliente(${JSON.stringify(c)})'>Editar</button>
        <button class="btn-action btn-delete" onclick="eliminarCliente('${c.id}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

function filtrarClientes(q) {
  const filtrados = todosLosClientes.filter(c =>
    c.nombre.toLowerCase().includes(q.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(q.toLowerCase())
  );
  renderClientesTabla(filtrados);
}

function abrirModalCliente() {
  document.getElementById("modal-cliente-title").textContent = "Nuevo Cliente";
  document.getElementById("cliente-id").value           = "";
  document.getElementById("form-cliente-nombre").value  = "";
  document.getElementById("form-cliente-email").value   = "";
  document.getElementById("form-cliente-telefono").value = "";
  document.getElementById("modal-cliente").classList.add("open");
}

function editarCliente(c) {
  document.getElementById("modal-cliente-title").textContent  = "Editar Cliente";
  document.getElementById("cliente-id").value            = c.id;
  document.getElementById("form-cliente-nombre").value   = c.nombre   || "";
  document.getElementById("form-cliente-email").value    = c.email    || "";
  document.getElementById("form-cliente-telefono").value = c.telefono || "";
  document.getElementById("modal-cliente").classList.add("open");
}

async function guardarCliente() {
  const id       = document.getElementById("cliente-id").value;
  const nombre   = document.getElementById("form-cliente-nombre").value.trim();
  const email    = document.getElementById("form-cliente-email").value.trim();
  const telefono = document.getElementById("form-cliente-telefono").value.trim();

  if (!nombre) { mostrarToast("El nombre es obligatorio"); return; }

  if (id) {
    const { error } = await sb.from("clientes").update({ nombre, email, telefono }).eq("id", id);
    if (error) { mostrarToast("Error al actualizar"); return; }
    mostrarToast("✅ Cliente actualizado");
  } else {
    const { error } = await sb.from("clientes").insert({ nombre, email, telefono });
    if (error) { mostrarToast("Error al crear cliente"); return; }
    mostrarToast("✅ Cliente creado");
  }

  cerrarModal("modal-cliente");
  cargarClientes();
}

async function eliminarCliente(id) {
  if (!confirm("¿Eliminar este cliente?")) return;
  const { error } = await sb.from("clientes").delete().eq("id", id);
  if (error) { mostrarToast("Error al eliminar"); return; }
  mostrarToast("✅ Cliente eliminado");
  cargarClientes();
}

// ================= STOCK / PRODUCTOS =================
async function cargarStock() {
  const { data, error } = await sb
    .from("productos")
    .select("*")
    .order("nombre");

  if (error) { mostrarToast("Error cargando stock"); return; }

  const grid = document.getElementById("stock-grid");
  if (!data.length) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>Sin productos</p></div>`;
    return;
  }

  grid.innerHTML = data.map(p => {
    const tallesHTML = p.tiene_talle
      ? ["XS","S","M","L","XL","XXL"].map(t => {
          const key = "stock_" + t.toLowerCase();
          const qty = p[key] ?? 0;
          const cls = qty === 0 ? "out" : qty <= 3 ? "low" : "";
          return `<div class="talle-chip ${cls}"><span class="talle-label">${t}</span><span class="talle-qty">${qty}</span></div>`;
        }).join("")
      : `<div class="talle-chip"><span class="talle-label">STOCK</span><span class="talle-qty">${p.stock_sin_talle ?? 0}</span></div>`;

    return `
      <div class="stock-card">
        <div class="stock-card-header">
          <h3>${p.nombre}</h3>
          <span class="precio">$${Number(p.precio_base).toLocaleString("es-AR")}</span>
        </div>
        <div class="talles-stock">${tallesHTML}</div>
        <div class="stock-card-actions">
          <button class="btn-action btn-edit"   onclick='abrirModalProducto(${JSON.stringify(p)})'>Editar</button>
          <button class="btn-action btn-delete" onclick="eliminarProducto('${p.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join("");
}

function toggleTalles() {
  const tieneTalle = document.getElementById("form-prod-talle").value === "true";
  document.getElementById("talles-inputs").style.display    = tieneTalle ? "block" : "none";
  document.getElementById("sin-talle-input").style.display  = tieneTalle ? "none"  : "block";
}

function abrirModalProducto(p = null) {
  document.getElementById("modal-producto-title").textContent = p ? "Editar Producto" : "Nuevo Producto";
  document.getElementById("producto-id").value       = p ? p.id : "";
  document.getElementById("form-prod-nombre").value  = p ? p.nombre : "";
  document.getElementById("form-prod-precio").value  = p ? p.precio_base : "";
  document.getElementById("form-prod-talle").value   = p ? String(p.tiene_talle) : "true";
  document.getElementById("form-prod-imagen").value  = p ? (p.imagen_url || "") : "";
  document.getElementById("form-stock-xs").value     = p ? (p.stock_xs  || 0) : 0;
  document.getElementById("form-stock-s").value      = p ? (p.stock_s   || 0) : 0;
  document.getElementById("form-stock-m").value      = p ? (p.stock_m   || 0) : 0;
  document.getElementById("form-stock-l").value      = p ? (p.stock_l   || 0) : 0;
  document.getElementById("form-stock-xl").value     = p ? (p.stock_xl  || 0) : 0;
  document.getElementById("form-stock-xxl").value    = p ? (p.stock_xxl || 0) : 0;
  document.getElementById("form-stock-sin").value    = p ? (p.stock_sin_talle || 0) : 0;
  toggleTalles();
  document.getElementById("modal-producto").classList.add("open");
}

async function guardarProducto() {
  const id         = document.getElementById("producto-id").value;
  const nombre     = document.getElementById("form-prod-nombre").value.trim();
  const precio     = Number(document.getElementById("form-prod-precio").value);
  const tieneTalle = document.getElementById("form-prod-talle").value === "true";
  const imagen     = document.getElementById("form-prod-imagen").value.trim();

  if (!nombre || !precio) { mostrarToast("Nombre y precio son obligatorios"); return; }

  const payload = {
    nombre,
    precio_base:     precio,
    tiene_talle:     tieneTalle,
    imagen_url:      imagen || null,
    stock_xs:        tieneTalle ? Number(document.getElementById("form-stock-xs").value)  : 0,
    stock_s:         tieneTalle ? Number(document.getElementById("form-stock-s").value)   : 0,
    stock_m:         tieneTalle ? Number(document.getElementById("form-stock-m").value)   : 0,
    stock_l:         tieneTalle ? Number(document.getElementById("form-stock-l").value)   : 0,
    stock_xl:        tieneTalle ? Number(document.getElementById("form-stock-xl").value)  : 0,
    stock_xxl:       tieneTalle ? Number(document.getElementById("form-stock-xxl").value) : 0,
    stock_sin_talle: tieneTalle ? 0 : Number(document.getElementById("form-stock-sin").value),
  };

  if (id) {
    const { error } = await sb.from("productos").update(payload).eq("id", id);
    if (error) { mostrarToast("Error al actualizar"); return; }
    mostrarToast("✅ Producto actualizado");
  } else {
    const { error } = await sb.from("productos").insert(payload);
    if (error) { mostrarToast("Error al crear producto"); return; }
    mostrarToast("✅ Producto creado");
  }

  cerrarModal("modal-producto");
  cargarStock();
}

async function eliminarProducto(id) {
  if (!confirm("¿Eliminar este producto?")) return;
  const { error } = await sb.from("productos").delete().eq("id", id);
  if (error) { mostrarToast("Error al eliminar"); return; }
  mostrarToast("✅ Producto eliminado");
  cargarStock();
}

// ================= CÓDIGOS SOCIO =================
async function cargarCodigos() {
  const { data, error } = await sb
    .from("codigos_socio")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { mostrarToast("Error cargando códigos"); return; }

  const tbody = document.getElementById("codigos-tbody");
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="icon">🎟️</div><p>Sin códigos</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(c => `
    <tr>
      <td><strong>${c.codigo}</strong></td>
      <td><span class="badge badge-${c.activo ? "activo" : "inactivo"}">${c.activo ? "Activo" : "Inactivo"}</span></td>
      <td>${new Date(c.created_at).toLocaleDateString("es-AR")}</td>
      <td>
        <button class="btn-action btn-edit" onclick="toggleCodigo('${c.id}', ${c.activo})">${c.activo ? "Desactivar" : "Activar"}</button>
        <button class="btn-action btn-delete" onclick="eliminarCodigo('${c.id}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

function abrirModalCodigo() {
  document.getElementById("form-codigo").value = "";
  document.getElementById("modal-codigo").classList.add("open");
}

async function guardarCodigo() {
  const codigo = document.getElementById("form-codigo").value.trim();
  if (!codigo) { mostrarToast("Ingresá un código"); return; }

  const { error } = await sb.from("codigos_socio").insert({ codigo });
  if (error) { mostrarToast("Error al crear código (¿ya existe?)"); return; }

  mostrarToast("✅ Código creado");
  cerrarModal("modal-codigo");
  cargarCodigos();
}

async function toggleCodigo(id, activo) {
  const { error } = await sb.from("codigos_socio").update({ activo: !activo }).eq("id", id);
  if (error) { mostrarToast("Error al actualizar"); return; }
  mostrarToast(`✅ Código ${!activo ? "activado" : "desactivado"}`);
  cargarCodigos();
}

async function eliminarCodigo(id) {
  if (!confirm("¿Eliminar este código?")) return;
  const { error } = await sb.from("codigos_socio").delete().eq("id", id);
  if (error) { mostrarToast("Error al eliminar"); return; }
  mostrarToast("✅ Código eliminado");
  cargarCodigos();
}

// ================= UTILS =================
function cerrarModal(id) {
  document.getElementById(id).classList.remove("open");
}

let toastTimer;
function mostrarToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

// Cerrar modal clickeando el overlay
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
});