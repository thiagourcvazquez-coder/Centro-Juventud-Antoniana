// ================= SUPABASE =================
const SUPABASE_URL  = "https://rcusuuyakezwrwlpqiby.supabase.co";
const SUPABASE_ANON = "TU_SUPABASE_ANON_KEY";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON
);

// ================= EDGE FUNCTION URL =================
const EDGE_FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/crear-preferencia`;

// ================= URL BASE =================
const SITE_URL = window.location.origin;

// ================= CONSTANTES =================
const TALLES_CON_DESCUENTO = ["XS", "S", "M"];
const DESCUENTO_TALLE      = 20000;


// ================= TALLES =================

function seleccionarTalle(btn) {

  const card = btn.closest(".card");

  card
    .querySelectorAll(".talle")
    .forEach(t => t.classList.remove("seleccionado"));

  btn.classList.add("seleccionado");

  const tieneTalleDescuento =
    card.querySelector(
      ".talles-selector[data-tiene-talle='true']"
    );

  if (!tieneTalleDescuento) return;

  const precioBase =
    Number(
      card.querySelector(".precio-base")
      .dataset.precio
    );

  const bloqueDescuento =
    card.querySelector(".precio-descuento-talle");

  const spanFinal =
    card.querySelector(".precio-final-talle");

  if (
    TALLES_CON_DESCUENTO.includes(
      btn.textContent.trim()
    )
  ) {

    const precioFinal =
      Math.max(
        0,
        precioBase - DESCUENTO_TALLE
      );

    spanFinal.textContent =
      precioFinal.toLocaleString("es-AR");

    bloqueDescuento.style.display = "block";

  } else {

    bloqueDescuento.style.display = "none";
  }
}


// ================= SLIDER =================

let posicion = 0;

function moverSlider(direccion) {

  const slider =
    document.getElementById("slider");

  const contenedor =
    slider.parentElement;

  const primeraCard =
    slider.querySelector(".card");

  const gap = 20;

  const paso =
    primeraCard.offsetWidth + gap;

  const maxPos =
    slider.scrollWidth -
    contenedor.clientWidth;

  posicion += direccion * paso;

  posicion = Math.max(
    0,
    Math.min(posicion, maxPos)
  );

  slider.style.transform =
    `translateX(-${posicion}px)`;
}

window.addEventListener("resize", () => {

  posicion = 0;

  const slider =
    document.getElementById("slider");

  if (slider) {
    slider.style.transform =
      "translateX(0)";
  }
});


// ================= CARRITO =================

let carrito =
  JSON.parse(
    localStorage.getItem("carrito")
  ) || [];

let descuentoAplicado = false;
let codigoSocioUsado  = "";

const descuentoGuardado =
  JSON.parse(
    localStorage.getItem("descuentoSocio")
  );

if (descuentoGuardado) {

  descuentoAplicado =
    descuentoGuardado.aplicado || false;

  codigoSocioUsado =
    descuentoGuardado.codigo || "";
}

document.addEventListener(
  "DOMContentLoaded",
  () => {

    document
      .querySelectorAll(".btn-agregar")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            const card =
              btn.closest(".card");

            const tieneTalle =
              btn.dataset.descuentoTalle === "true";

            let nombre =
              btn.dataset.nombre;

            let precio =
              Number(btn.dataset.precio);

            if (tieneTalle) {

              const talleSeleccionado =
                card.querySelector(
                  ".talle.seleccionado"
                );

              if (!talleSeleccionado) {

                mostrarToast(
                  "Seleccioná un talle"
                );

                return;
              }

              const talleTexto =
                talleSeleccionado
                .textContent
                .trim();

              nombre =
                nombre + " — " + talleTexto;

              if (
                TALLES_CON_DESCUENTO.includes(
                  talleTexto
                )
              ) {

                precio = Math.max(
                  0,
                  precio - DESCUENTO_TALLE
                );
              }
            }

            const imagen =
              card.querySelector("img").src;

            agregarAlCarrito(
              nombre,
              precio,
              imagen
            );
          }
        );
      });

    actualizarCarrito();
  }
);


// ================= AGREGAR CARRITO =================

function agregarAlCarrito(
  nombre,
  precio,
  imagen
) {

  const existente =
    carrito.find(
      p => p.nombre === nombre
    );

  if (existente) {

    existente.cantidad++;

  } else {

    carrito.push({
      nombre,
      precio,
      imagen: imagen || "",
      cantidad: 1
    });
  }

  guardarCarrito();

  actualizarContador();

  actualizarCarrito();

  mostrarToast(
    `"${nombre}" agregado`
  );
}


// ================= ACTUALIZAR CARRITO =================

function actualizarCarrito() {

  const lista =
    document.getElementById("lista-carrito");

  const totalElemento =
    document.getElementById("total");

  const subtotalElem =
    document.getElementById("subtotal");

  const cantidadElem =
    document.getElementById("cantidad-productos");

  actualizarContador();

  if (carrito.length === 0) {

    lista.innerHTML =
      "<p class='carrito-vacio'>Tu carrito está vacío 🛒</p>";

    totalElemento.textContent = "0";
    subtotalElem.textContent  = "0";

    cantidadElem.textContent =
      "0 productos";

    return;
  }

  let html      = "";
  let subtotal  = 0;
  let cantTotal = 0;

  carrito.forEach((producto, index) => {

    const subtotalProducto =
      producto.precio *
      producto.cantidad;

    subtotal += subtotalProducto;

    cantTotal += producto.cantidad;

    html += `
      <div class="item-carrito">

        <div class="item-imagen">
          <img
            src="${producto.imagen}"
            alt="${producto.nombre}"
          >
        </div>

        <div class="item-info">

          <p class="item-nombre">
            ${producto.nombre}
          </p>

          <p class="item-precio-unit">
            $${producto.precio.toLocaleString("es-AR")}
          </p>

          <div class="item-cantidad-controls">

            <button
              class="btn-cant"
              onclick="cambiarCantidad(${index}, -1)"
            >
              −
            </button>

            <span class="item-cantidad">
              x${producto.cantidad}
            </span>

            <button
              class="btn-cant"
              onclick="cambiarCantidad(${index}, 1)"
            >
              +
            </button>

          </div>
        </div>

        <div class="item-derecha">

          <button
            class="btn-eliminar"
            onclick="eliminarProducto(${index})"
          >
            🗑
          </button>

          <p class="item-subtotal">
            $${subtotalProducto.toLocaleString("es-AR")}
          </p>

        </div>
      </div>
    `;
  });

  lista.innerHTML = html;

  subtotalElem.textContent =
    subtotal.toLocaleString("es-AR");

  cantidadElem.textContent =
    `${cantTotal} producto${cantTotal !== 1 ? "s" : ""}`;

  let totalFinal = subtotal;

  if (descuentoAplicado) {

    totalFinal =
      subtotal * 0.90;
  }

  totalElemento.textContent =
    Math.round(totalFinal)
    .toLocaleString("es-AR");
}


// ================= CAMBIAR CANTIDAD =================

function cambiarCantidad(index, delta) {

  carrito[index].cantidad += delta;

  if (carrito[index].cantidad <= 0) {
    carrito.splice(index, 1);
  }

  guardarCarrito();

  actualizarCarrito();
}


// ================= ELIMINAR =================

function eliminarProducto(index) {

  carrito.splice(index, 1);

  guardarCarrito();

  actualizarCarrito();
}


// ================= CONTADOR =================

function actualizarContador() {

  const contador =
    document.getElementById("contador");

  if (!contador) return;

  const total =
    carrito.reduce(
      (sum, p) => sum + p.cantidad,
      0
    );

  contador.textContent = total;
}


// ================= STORAGE =================

function guardarCarrito() {

  localStorage.setItem(
    "carrito",
    JSON.stringify(carrito)
  );
}

function guardarDescuento() {

  localStorage.setItem(
    "descuentoSocio",

    JSON.stringify({
      aplicado: descuentoAplicado,
      codigo: codigoSocioUsado
    })
  );
}


// ================= PANEL =================

function abrirCarrito() {

  document
    .getElementById("panel-carrito")
    .classList.add("abierto");
}

function cerrarCarrito() {

  document
    .getElementById("panel-carrito")
    .classList.remove("abierto");
}


// ================= DESCUENTO =================

async function aplicarDescuentoSocio() {

  if (descuentoAplicado) {

    mostrarToast(
      "Ya aplicaste descuento"
    );

    return;
  }

  const inputCodigo =
    document.getElementById(
      "input-codigo-socio"
    );

  const codigo =
    inputCodigo.value.trim();

  if (!codigo) {

    mostrarToast(
      "Ingresá un código"
    );

    return;
  }

  const { data, error } =
    await supabaseClient
      .from("codigos_socio")
      .select("codigo")
      .eq("codigo", codigo)
      .eq("activo", true)
      .single();

  if (error || !data) {

    mostrarToast(
      "Código inválido"
    );

    return;
  }

  descuentoAplicado = true;

  codigoSocioUsado = codigo;

  guardarDescuento();

  actualizarCarrito();

  mostrarToast(
    "Descuento aplicado"
  );
}


// ================= MERCADO PAGO =================

let pagandoEnProceso = false;

function procesarPago() {

  if (carrito.length === 0) {

    mostrarToast(
      "Tu carrito está vacío"
    );

    return;
  }

  if (pagandoEnProceso) {

    mostrarToast(
      "Pago en proceso"
    );

    return;
  }

  iniciarCheckoutMP();
}


// ================= INICIAR CHECKOUT =================

async function iniciarCheckoutMP() {

  const nombreCliente =
    document.getElementById(
      "cliente-nombre"
    ).value.trim();

  const emailCliente =
    document.getElementById(
      "cliente-email"
    ).value.trim();

  const telCliente =
    document.getElementById(
      "cliente-telefono"
    ).value.trim();

  const dniCliente =
    document.getElementById(
      "cliente-dni"
    ).value.trim();

  if (
    !nombreCliente ||
    !emailCliente ||
    !telCliente ||
    !dniCliente
  ) {

    mostrarToast(
      "Completá todos los datos"
    );

    return;
  }

  pagandoEnProceso = true;

  const btnPago =
    document.querySelector(
      ".pagos button:last-child"
    );

  if (btnPago) {

    btnPago.disabled = true;

    btnPago.textContent =
      "Procesando...";
  }

  try {

    const itemsMP =
      carrito.map(producto => ({

        id: crypto.randomUUID(),

        title: producto.nombre,

        quantity: producto.cantidad,

        unit_price:
          descuentoAplicado
            ? Math.round(
                producto.precio * 0.90
              )
            : producto.precio,

        currency_id: "ARS",
      }));

    const externalRef =
      `CJA-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2,7)
        .toUpperCase()}`;

    const ventaPendiente = {

      external_reference:
        externalRef,

      nombre_cliente:
        nombreCliente,

      email_cliente:
        emailCliente,

      tel_cliente:
        telCliente,

      dni_cliente:
        dniCliente,

      carrito: [...carrito],

      descuento_socio:
        descuentoAplicado,

      codigo_socio:
        codigoSocioUsado || null,
    };

    localStorage.setItem(
      "ventaPendiente",
      JSON.stringify(
        ventaPendiente
      )
    );

    const response = await fetch(
      EDGE_FUNCTION_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "apikey":
            SUPABASE_ANON,

          "Authorization":
            `Bearer ${SUPABASE_ANON}`,
        },

        body: JSON.stringify({

          items: itemsMP,

          payer: {

            name:
              nombreCliente,

            email:
              emailCliente,

            phone: {
              number:
                telCliente
            },

            dni:
              dniCliente,
          },

          back_urls: {

            success:
              `${SITE_URL}/success.html`,

            failure:
              `${SITE_URL}/failure.html`,

            pending:
              `${SITE_URL}/pending.html`,
          },

          external_reference:
            externalRef,
        }),
      }
    );

    const data =
      await response.json();

    console.log(
      "RESPUESTA MP:",
      data
    );

    if (
      !response.ok ||
      !data.init_point
    ) {

      console.error(
        "ERROR MP:",
        data
      );

      mostrarToast(
        "Error Mercado Pago"
      );

      return;
    }

    window.location.href=data.init_point;

  } catch (err) {

    console.error(err);

    mostrarToast(
      "Error inesperado"
    );

  } finally {

    pagandoEnProceso = false;

    if (btnPago) {

      btnPago.disabled = false;

      btnPago.textContent =
        "Pagar con Mercado Pago";
    }
  }
}


// ================= PRODUCTOS DB =================

async function obtenerProductosDB() {

  const { data, error } =
    await supabaseClient
      .from("productos")
      .select("id, nombre");

  if (error) {

    console.error(error);

    return [];
  }

  return data;
}