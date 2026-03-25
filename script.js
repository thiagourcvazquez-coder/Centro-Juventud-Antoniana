// ================= SLIDER =================

let posicion = 0;

function moverSlider(direccion) {
  const slider = document.getElementById("slider");
  const contenedor = slider.parentElement;
  const primeraCard = slider.querySelector(".card");
  const gap = 20;
  const paso = primeraCard.offsetWidth + gap;
  const maxPos = slider.scrollWidth - contenedor.clientWidth;
  posicion += direccion * paso;
  posicion = Math.max(0, Math.min(posicion, maxPos));
  slider.style.transform = `translateX(-${posicion}px)`;
}


// ================= CARRITO =================

// Carga el carrito guardado al recargar la página
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".btn-agregar").forEach(btn => {
    btn.addEventListener("click", () => {
      const nombre = btn.dataset.nombre;
      const precio = Number(btn.dataset.precio);
      const imagen = btn.closest(".card").querySelector("img").src;
      agregarAlCarrito(nombre, precio, imagen);
    });
  });
  actualizarCarrito();
});


function agregarAlCarrito(nombre, precio, imagen) {
  // Si ya existe, aumenta la cantidad
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
    lista.innerHTML = "<p class='carrito-vacio'>Tu carrito está vacío 🛒</p>";
    if (totalElemento)   totalElemento.textContent   = "0";
    if (subtotalElem)    subtotalElem.textContent     = "0";
    if (cantidadElem)    cantidadElem.textContent     = "0 productos";
    return;
  }

  let html  = "";
  let total = 0;
  let cantTotal = 0;

  carrito.forEach((producto, index) => {
    const subtotalProducto = producto.precio * producto.cantidad;
    total    += subtotalProducto;
    cantTotal += producto.cantidad;

    html += `
      <div class="item-carrito">
        <div class="item-imagen">
          <img src="${producto.imagen}" alt="${producto.nombre}" onerror="this.style.display='none'">
        </div>
        <div class="item-info">
          <p class="item-nombre">${producto.nombre}</p>
          <p class="item-precio-unit">$${producto.precio.toLocaleString("es-AR")} c/u</p>
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

  const totalStr = total.toLocaleString("es-AR");
  if (totalElemento) totalElemento.textContent = totalStr;
  if (subtotalElem)  subtotalElem.textContent  = totalStr;
  if (cantidadElem)  cantidadElem.textContent  = `${cantTotal} producto${cantTotal !== 1 ? "s" : ""}`;
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
  const mensajes = {
    tarjeta: "Redirigiendo al pago con tarjeta...",
    mercadopago: "Redirigiendo a Mercado Pago..."
  };
  mostrarToast(mensajes[metodo] || "Procesando pago...");
}

function aplicarDescuentoSocio() {
  const codigo = prompt("Ingresá tu código de socio:");
  if (codigo && codigo.trim() !== "") {
    mostrarToast("✅ Descuento de socio aplicado");
  } else {
    mostrarToast("Código inválido");
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

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-contacto");

  if (form) {
    form.addEventListener("submit", () => {
      mostrarToast("✅ Mensaje enviado correctamente");
      cerrarModal();
    });
  }
});


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