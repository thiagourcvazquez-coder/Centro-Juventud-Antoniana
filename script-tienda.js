// ================= SUPABASE =================
const SUPABASE_URL  = "https://rcusuuyakezwrwlpqiby.supabase.co";
const SUPABASE_ANON = "TU_SUPABASE_ANON_KEY";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON
);

// ================= EDGE FUNCTION =================
const EDGE_FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/crear-preferencia`;

const SITE_URL = window.location.origin;

// ================= CONSTANTES =================
const TALLES_CON_DESCUENTO = ["XS", "S", "M"];
const DESCUENTO_TALLE = 20000;

// ================= CARRITO =================
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

let descuentoAplicado = false;
let codigoSocioUsado  = "";

const descuentoGuardado =
  JSON.parse(localStorage.getItem("descuentoSocio"));

if (descuentoGuardado) {
  descuentoAplicado = descuentoGuardado.aplicado || false;
  codigoSocioUsado  = descuentoGuardado.codigo || "";
}

// ================= PAGOS =================
let pagandoEnProceso = false;

// ================= PROCESAR PAGO =================
function procesarPago() {

  if (carrito.length === 0) {
    mostrarToast("Tu carrito está vacío");
    return;
  }

  if (pagandoEnProceso) {
    mostrarToast("Ya hay un pago en proceso");
    return;
  }

  iniciarCheckoutMP();
}

// ================= CHECKOUT MERCADO PAGO =================
async function iniciarCheckoutMP() {

  const nombreCliente =
    document.getElementById("cliente-nombre").value.trim();

  const emailCliente =
    document.getElementById("cliente-email").value.trim();

  const telCliente =
    document.getElementById("cliente-telefono").value.trim();

  const dniCliente =
    document.getElementById("cliente-dni").value.trim();

  // ================= VALIDACIONES =================
  if (
    !nombreCliente ||
    !emailCliente ||
    !telCliente ||
    !dniCliente
  ) {
    mostrarToast("Completá todos los datos");
    return;
  }

  pagandoEnProceso = true;

  const btnPago =
    document.querySelector(".pagos button:last-child");

  if (btnPago) {
    btnPago.disabled = true;
    btnPago.textContent = "Procesando...";
  }

  try {

    // ================= ITEMS MP =================
    const itemsMP = carrito.map(producto => ({
      id: crypto.randomUUID(),

      title: producto.nombre,

      quantity: producto.cantidad,

      unit_price: Number(
        descuentoAplicado
          ? Math.round(producto.precio * 0.90)
          : producto.precio
      ),

      currency_id: "ARS",
    }));

    // ================= REFERENCIA =================
    const externalRef =
      `CJA-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2,7)
        .toUpperCase()}`;

    // ================= TOTAL =================
    let subtotal = carrito.reduce(
      (sum, p) => sum + (p.precio * p.cantidad),
      0
    );

    let totalFinal =
      descuentoAplicado
        ? subtotal * 0.90
        : subtotal;

    // ================= GUARDAR VENTA PENDIENTE =================
    const ventaPendiente = {
      external_reference: externalRef,

      nombre_cliente: nombreCliente,
      email_cliente:  emailCliente,
      tel_cliente:    telCliente,
      dni_cliente:    dniCliente,

      carrito: [...carrito],

      descuento_socio: descuentoAplicado,
      codigo_socio: codigoSocioUsado || null,

      total: totalFinal,
    };

    localStorage.setItem(
      "ventaPendiente",
      JSON.stringify(ventaPendiente)
    );

    // ================= REQUEST EDGE FUNCTION =================
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${SUPABASE_ANON}`,
      },

      body: JSON.stringify({

        items: itemsMP,

        payer: {
          name: nombreCliente,

          email: emailCliente,

          phone: {
            number: telCliente
          },

          dni: dniCliente,
        },

        back_urls: {
          success: `${SITE_URL}/success.html`,
          failure: `${SITE_URL}/failure.html`,
          pending: `${SITE_URL}/pending.html`,
        },

        external_reference: externalRef,
      }),
    });

    const data = await response.json();

    console.log("RESPUESTA MP:", data);

    // ================= ERROR =================
    if (!response.ok || !data.init_point) {

      console.error("ERROR MP:", data);

      mostrarToast(
        "Error al conectar con Mercado Pago"
      );

      return;
    }

    // ================= REDIRECCIÓN =================
    window.location.href =
      data.sandbox_url ?? data.init_point;

  } catch (err) {

    console.error(err);

    mostrarToast(
      "Error inesperado al iniciar pago"
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