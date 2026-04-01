// ================= SUPABASE =================
// Reemplazá estos dos valores con los de tu proyecto:
// Supabase → Settings → API
const SUPABASE_URL    = "https://rcusuuyakezwrwlpqiby.supabase.co";
const SUPABASE_ANON   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdXN1dXlha2V6d3J3bHBxaWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM3ODIsImV4cCI6MjA5MDEzOTc4Mn0.gjWgUR-JTsQ06JW5u36XgxRAux8-dN2Huz_lf9kvks4";

const supabaseClient  = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);


// ================= CONSTANTES =================

const TALLES_CON_DESCUENTO = ["XS", "S", "M"];
const DESCUENTO_TALLE      = 20000;


// ================= TALLES =================

function seleccionarTalle(btn) {
  const card = btn.closest(".card");

  card.querySelectorAll(".talle").forEach(t => t.classList.remove("seleccionado"));
  btn.classList.add("seleccionado");

  const tieneTalleDescuento = card.querySelector(".talles-selector[data-tiene-talle='true']");
  if (!tieneTalleDescuento) return;

  const precioBase      = Number(card.querySelector(".precio-base").dataset.precio);
  const bloqueDescuento = card.querySelector(".precio-descuento-talle");
  const spanFinal       = card.querySelector(".precio-final-talle");

  if (TALLES_CON_DESCUENTO.includes(btn.textContent.trim())) {
    const precioFinal = Math.max(0, precioBase - DESCUENTO_TALLE);
    spanFinal.textContent = precioFinal.toLocaleString("es-AR");
    bloqueDescuento.style.display = "block";
  } else {
    bloqueDescuento.style.display = "none";
  }
}


// ================= SLIDER =================

let posicion = 0;

function moverSlider(direccion) {
  const slider      = document.getElementById("slider");
  const contenedor  = slider.parentElement;
  const primeraCard = slider.querySelector(".card");
  const gap         = 20;
  const paso        = primeraCard.offsetWidth + gap;
  const maxPos      = slider.scrollWidth - contenedor.clientWidth;
  posicion += direccion * paso;
  posicion = Math.max(0, Math.min(posicion, maxPos));
  slider.style.transform = `translateX(-${posicion}px)`;
}


// ================= CARRITO =================

let carrito           = JSON.parse(localStorage.getItem("carrito")) || [];
let descuentoAplicado = false;
let codigoSocioUsado  = "";

document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll(".btn-agregar").forEach(btn => {
    btn.addEventListener("click", () => {
      const card       = btn.closest(".card");
      const tieneTalle = btn.dataset.descuentoTalle === "true";
      let   nombre     = btn.dataset.nombre;
      let   precio     = Number(btn.dataset.precio);

      if (tieneTalle) {
        const talleSeleccionado = card.querySelector(".talle.seleccionado");
        if (!talleSeleccionado) {
          mostrarToast("Seleccioná un talle antes de agregar");
          card.querySelectorAll(".talle").forEach(t => {
            t.style.borderColor = "#e55";
            setTimeout(() => { t.style.borderColor = ""; }, 1000);
          });
          return;
        }

        const talleTexto     = talleSeleccionado.textContent.trim();
        const tieneDescTalle = TALLES_CON_DESCUENTO.includes(talleTexto);

        nombre = nombre + " — " + talleTexto;
        if (tieneDescTalle) {
          precio = Math.max(0, precio - DESCUENTO_TALLE);
        }
      }

      const imagen = card.querySelector("img").src;
      agregarAlCarrito(nombre, precio, imagen);
    });
  });

  actualizarCarrito();

  const form = document.getElementById("form-contacto");
  if (form) {
    form.addEventListener("submit", () => {
      mostrarToast("✅ Mensaje enviado correctamente");
      cerrarModal();
    });
  }
});


function agregarAlCarrito(nombre, precio, imagen) {
  const existente = carrito.find(p => p.nombre === nombre);
  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ nombre, precio, imagen: imagen || "", cantidad: 1 });
  }
  guardarCarrito();
  actualizarContador();

  const iconoCarrito = document.querySelector(".carrito");
  iconoCarrito.classList.remove("bump");
  void iconoCarrito.offsetWidth;
  iconoCarrito.classList.add("bump");

  mostrarToast(`"${nombre}" agregado al carrito`);
  actualizarCarrito();
}


function actualizarCarrito() {
  const lista         = document.getElementById("lista-carrito");
  const totalElemento = document.getElementById("total");
  const subtotalElem  = document.getElementById("subtotal");
  const cantidadElem  = document.getElementById("cantidad-productos");

  actualizarContador();

  if (carrito.length === 0) {
    descuentoAplicado = false;
    codigoSocioUsado  = "";
    lista.innerHTML   = "<p class='carrito-vacio'>Tu carrito está vacío 🛒</p>";
    if (totalElemento) totalElemento.textContent = "0";
    if (subtotalElem)  subtotalElem.textContent  = "0";
    if (cantidadElem)  cantidadElem.textContent  = "0 productos";
    const filaDesc = document.getElementById("fila-descuento-socio");
    if (filaDesc) filaDesc.style.display = "none";
    return;
  }

  let html      = "";
  let subtotal  = 0;
  let cantTotal = 0;

  carrito.forEach((producto, index) => {
    const subtotalProducto = producto.precio * producto.cantidad;
    subtotal  += subtotalProducto;
    cantTotal += producto.cantidad;

    const matchTalle    = producto.nombre.match(/ — ([A-Z]+)$/);
    const talle         = matchTalle ? matchTalle[1] : null;
    const tuvoDescuento = talle && TALLES_CON_DESCUENTO.includes(talle);

    const badgeDescuento = tuvoDescuento
      ? `<p class="item-descuento-talle-badge">🏷️ −$${DESCUENTO_TALLE.toLocaleString("es-AR")} por talle</p>`
      : "";

    html += `
      <div class="item-carrito">
        <div class="item-imagen">
          <img src="${producto.imagen}" alt="${producto.nombre}" onerror="this.style.display='none'">
        </div>
        <div class="item-info">
          <p class="item-nombre">${producto.nombre}</p>
          <p class="item-precio-unit">$${producto.precio.toLocaleString("es-AR")} c/u</p>
          ${badgeDescuento}
          <div class="item-cantidad-controls">
            <button class="btn-cant" onclick="cambiarCantidad(${index}, -1)">−</button>
            <span class="item-cantidad">x${producto.cantidad}</span>
            <button class="btn-cant" onclick="cambiarCantidad(${index}, 1)">+</button>
          </div>
        </div>
        <div class="item-derecha">
          <button class="btn-eliminar" onclick="eliminarProducto(${index})">🗑</button>
          <p class="item-subtotal">$${subtotalProducto.toLocaleString("es-AR")}</p>
        </div>
      </div>
    `;
  });

  lista.innerHTML = html;

  if (subtotalElem) subtotalElem.textContent = subtotal.toLocaleString("es-AR");
  if (cantidadElem) cantidadElem.textContent = `${cantTotal} producto${cantTotal !== 1 ? "s" : ""}`;

  const filaDescuentoSocio  = document.getElementById("fila-descuento-socio");
  const montoDescuentoSocio = document.getElementById("monto-descuento-socio");
  let totalFinal = subtotal;

  if (descuentoAplicado) {
    const ahorro = subtotal * 0.10;
    totalFinal   = subtotal - ahorro;
    if (filaDescuentoSocio)  filaDescuentoSocio.style.display  = "flex";
    if (montoDescuentoSocio) montoDescuentoSocio.textContent   = ahorro.toLocaleString("es-AR");
  } else {
    if (filaDescuentoSocio) filaDescuentoSocio.style.display = "none";
  }

  if (totalElemento) totalElemento.textContent = totalFinal.toLocaleString("es-AR");
}


function cambiarCantidad(index, delta) {
  carrito[index].cantidad += delta;
  if (carrito[index].cantidad <= 0) {
    carrito.splice(index, 1);
  }
  guardarCarrito();
  actualizarCarrito();
}


function eliminarProducto(index) {
  const nombre = carrito[index].nombre;
  carrito.splice(index, 1);
  guardarCarrito();
  actualizarCarrito();
  mostrarToast(`"${nombre}" eliminado del carrito`);
}


function actualizarContador() {
  const total = carrito.reduce((sum, p) => sum + p.cantidad, 0);
  document.getElementById("contador").textContent = total;
}


function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}


// ================= PANEL CARRITO =================

function abrirCarrito() {
  document.getElementById("panel-carrito").classList.add("abierto");
}

function cerrarCarrito() {
  document.getElementById("panel-carrito").classList.remove("abierto");
}


// ================= PAGOS =================

function procesarPago(metodo) {
  if (carrito.length === 0) {
    mostrarToast("Tu carrito está vacío");
    return;
  }
  mostrarToast(metodo === "tarjeta" ? "Redirigiendo al pago con tarjeta..." : "Redirigiendo a Mercado Pago...");
  registrarVentaEnSupabase(metodo);
}

async function aplicarDescuentoSocio() {
  if (descuentoAplicado) {
    mostrarToast("Ya tenés el descuento de socio aplicado ✅");
    return;
  }

  const codigo = prompt("Ingresá tu código de socio:");
  if (!codigo || codigo.trim() === "") {
    mostrarToast("Ingresá un código");
    return;
  }

  mostrarToast("Verificando código...");

  const { data, error } = await supabaseClient
    .from("codigos_socio")
    .select("codigo")
    .eq("codigo", codigo.trim())
    .eq("activo", true)
    .single();

  if (error || !data) {
    mostrarToast("❌ Código inválido o no existe");
    return;
  }

  descuentoAplicado = true;
  codigoSocioUsado  = codigo.trim();
  actualizarCarrito();
  mostrarToast("✅ Descuento de socio del 10% aplicado");
}


// ================= SUPABASE: REGISTRAR VENTA =================

async function obtenerProductosDB() {
  const { data, error } = await supabaseClient
    .from("productos")
    .select("id, nombre");
  if (error) { console.error("Error cargando productos:", error); return []; }
  return data;
}

async function registrarVentaEnSupabase(metodo) {
  try {
    // Traer los productos de la DB para mapear nombre → id
    const productosDB = await obtenerProductosDB();

    // Armar los ítems en el formato que espera registrar_venta()
    const items = carrito.map(producto => {
      // Extraer nombre base y talle del nombre guardado ("Camiseta Oficial — M")
      const matchTalle   = producto.nombre.match(/ — ([A-Z]+)$/);
      const talle        = matchTalle ? matchTalle[1] : "sin_talle";
      const nombreBase   = matchTalle
        ? producto.nombre.replace(/ — [A-Z]+$/, "").trim()
        : producto.nombre.trim();

      // Buscar el producto en la DB por nombre
      const productoDB   = productosDB.find(p =>
        p.nombre.toLowerCase() === nombreBase.toLowerCase()
      );

      // Calcular precio base y descuento de talle
      const descTalle    = TALLES_CON_DESCUENTO.includes(talle) ? DESCUENTO_TALLE : 0;
      const precioBase   = producto.precio + descTalle;

      return {
        producto_id:     productoDB ? productoDB.id : null,
        talle:           talle,
        cantidad:        producto.cantidad,
        precio_base:     precioBase,
        descuento_talle: descTalle
      };
    });

    // Llamar a la función de Supabase
    const { data, error } = await supabaseClient.rpc("registrar_venta", {
      p_cliente_id:   null,
      p_metodo_pago:  metodo,
      p_desc_socio:   descuentoAplicado,
      p_codigo_socio: codigoSocioUsado || null,
      p_items:        items
    });

    if (error) {
      console.error("Error al registrar venta:", error);
      mostrarToast("⚠️ Hubo un error al registrar la compra");
      return;
    }

    console.log("Venta registrada con ID:", data);

    // Limpiar carrito después de la compra
    carrito            = [];
    descuentoAplicado  = false;
    codigoSocioUsado   = "";
    guardarCarrito();
    actualizarCarrito();
    cerrarCarrito();
    mostrarToast("✅ Compra registrada correctamente");

  } catch (err) {
    console.error("Error inesperado:", err);
    mostrarToast("⚠️ Error de conexión con la base de datos");
  }
}


// ================= LIGHTBOX =================

function abrirLightbox(src) {
  document.getElementById("lightbox-img").src = src;
  document.getElementById("lightbox").classList.add("abierto");
}

function cerrarLightbox() {
  document.getElementById("lightbox").classList.remove("abierto");
}


// ================= MODAL CONTACTO =================

function abrirModal() {
  document.getElementById("modal-contacto").classList.add("abierto");
}

function cerrarModal() {
  document.getElementById("modal-contacto").classList.remove("abierto");
}

function cerrarModalSiOverlay(event) {
  if (event.target.id === "modal-contacto") {
    cerrarModal();
  }
}

function enviarContacto() {
  const nombre  = document.getElementById("contacto-nombre").value.trim();
  const email   = document.getElementById("contacto-email").value.trim();
  const mensaje = document.getElementById("contacto-mensaje").value.trim();

  if (!nombre || !email || !mensaje) {
    mostrarToast("Por favor completá todos los campos");
    return;
  }

  mostrarToast(`✅ Mensaje enviado, ${nombre}!`);
  cerrarModal();

  document.getElementById("contacto-nombre").value  = "";
  document.getElementById("contacto-email").value   = "";
  document.getElementById("contacto-mensaje").value = "";
}


// ================= TOAST =================

let toastTimeout;

function mostrarToast(mensaje) {
  const toast = document.getElementById("toast");
  toast.textContent = mensaje;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2500);
}