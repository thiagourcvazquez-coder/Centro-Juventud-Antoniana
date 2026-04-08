// ================= SUPABASE =================
const SUPABASE_URL  = "https://rcusuuyakezwrwlpqiby.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdXN1dXlha2V6d3J3bHBxaWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM3ODIsImV4cCI6MjA5MDEzOTc4Mn0.gjWgUR-JTsQ06JW5u36XgxRAux8-dN2Huz_lf9kvks4";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);


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

  // FIX: recalcular maxPos en cada llamada para que sea correcto
  // aunque se haya redimensionado la ventana
  const maxPos = slider.scrollWidth - contenedor.clientWidth;

  posicion += direccion * paso;
  posicion = Math.max(0, Math.min(posicion, maxPos));
  slider.style.transform = `translateX(-${posicion}px)`;
}

// FIX: resetear posicion si se redimensiona la ventana para evitar desfase
window.addEventListener("resize", () => {
  posicion = 0;
  const slider = document.getElementById("slider");
  if (slider) slider.style.transform = "translateX(0)";
});


// ================= CARRITO =================

let carrito           = JSON.parse(localStorage.getItem("carrito")) || [];
let descuentoAplicado = false;
let codigoSocioUsado  = "";

// FIX: guardar y restaurar estado del descuento entre recargas
const descuentoGuardado = JSON.parse(localStorage.getItem("descuentoSocio"));
if (descuentoGuardado) {
  descuentoAplicado = descuentoGuardado.aplicado || false;
  codigoSocioUsado  = descuentoGuardado.codigo   || "";
}

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
    guardarDescuento();
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
          <img src="${producto.imagen}" alt="${producto.nombre}" onerror="this.src='images/escudo.png'">
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
  const contador = document.getElementById("contador");
  if (!contador) return;
  const total = carrito.reduce((sum, p) => sum + p.cantidad, 0);
  contador.textContent = total;
}


function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function guardarDescuento() {
  localStorage.setItem("descuentoSocio", JSON.stringify({
    aplicado: descuentoAplicado,
    codigo:   codigoSocioUsado
  }));
}


// ================= PANEL CARRITO =================

function abrirCarrito() {
  document.getElementById("panel-carrito").classList.add("abierto");
}

function cerrarCarrito() {
  document.getElementById("panel-carrito").classList.remove("abierto");
}


// ================= PAGOS =================

// FIX: flag para evitar doble submit
let pagandoEnProceso = false;

function procesarPago(metodo) {
  if (carrito.length === 0) {
    mostrarToast("Tu carrito está vacío");
    return;
  }
  if (pagandoEnProceso) {
    mostrarToast("Ya se está procesando tu pago...");
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

  // FIX: usar un input en el DOM en lugar de prompt()
  const inputCodigo = document.getElementById("input-codigo-socio");
  const codigo = inputCodigo ? inputCodigo.value.trim() : "";

  if (!codigo) {
    mostrarToast("Ingresá un código de socio");
    if (inputCodigo) {
      inputCodigo.style.borderColor = "#e55";
      setTimeout(() => { inputCodigo.style.borderColor = ""; }, 1000);
    }
    return;
  }

  mostrarToast("Verificando código...");

  const { data, error } = await supabaseClient
    .from("codigos_socio")
    .select("codigo")
    .eq("codigo", codigo)
    .eq("activo", true)
    .single();

  if (error || !data) {
    mostrarToast("❌ Código inválido o no existe");
    return;
  }

  descuentoAplicado = true;
  codigoSocioUsado  = codigo;
  guardarDescuento();
  if (inputCodigo) inputCodigo.value = "";
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
  // Datos del cliente
  const nombreCliente = document.getElementById("cliente-nombre").value.trim();
  const emailCliente  = document.getElementById("cliente-email").value.trim();
  const telCliente    = document.getElementById("cliente-telefono").value.trim();
  const dniCliente    = document.getElementById("cliente-dni").value.trim();

  if (!nombreCliente || !emailCliente || !telCliente || !dniCliente) {
    mostrarToast("⚠️ Completá todos tus datos de contacto");
    return;
  }

  if (pagandoEnProceso) return;
  pagandoEnProceso = true;

  const botonesPago = document.querySelectorAll(".pagos button");
  botonesPago.forEach(b => b.disabled = true);

  try {
    const productosDB = await obtenerProductosDB();

    const items = carrito.map(producto => {
      const matchTalle  = producto.nombre.match(/ — ([A-Z]+)$/);
      const talle       = matchTalle ? matchTalle[1] : "sin_talle";
      const nombreBase  = matchTalle
        ? producto.nombre.replace(/ — [A-Z]+$/, "").trim()
        : producto.nombre.trim();

      const productoDB  = productosDB.find(p =>
        p.nombre.toLowerCase() === nombreBase.toLowerCase()
      );

      const descTalle   = TALLES_CON_DESCUENTO.includes(talle) ? DESCUENTO_TALLE : 0;
      const precioBase  = producto.precio + descTalle;

      return {
        producto_id:     productoDB ? productoDB.id : null,
        talle:           talle,
        cantidad:        producto.cantidad,
        precio_base:     precioBase,
        descuento_talle: descTalle
      };
    });

    const { data, error } = await supabaseClient.rpc("registrar_venta", {
      p_cliente_id:     null,
      p_nombre_cliente: nombreCliente,
      p_email_cliente:  emailCliente,
      p_tel_cliente:    telCliente,
      p_dni_cliente:    dniCliente,
      p_metodo_pago:    metodo,
      p_desc_socio:     descuentoAplicado,
      p_codigo_socio:   codigoSocioUsado || null,
      p_items:          items
    });

    if (error) {
      console.error("Error al registrar venta:", error);
      mostrarToast("⚠️ Hubo un error al registrar la compra");
      return;
    }

    // Solo vaciamos el carrito si la venta fue exitosa
    carrito           = [];
    descuentoAplicado = false;
    codigoSocioUsado  = "";
    guardarCarrito();
    guardarDescuento();
    actualizarCarrito();
    cerrarCarrito();
    mostrarToast("✅ Compra registrada correctamente");

  } catch (err) {
    console.error("Error inesperado:", err);
    mostrarToast("⚠️ Error de conexión con la base de datos");
  } finally {
    pagandoEnProceso = false;
    botonesPago.forEach(b => b.disabled = false);
  }
}