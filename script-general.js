// ================= HAMBURGER MENU =================
// Insertar dinámicamente el botón si no existe en el HTML
document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".header");
  const nav    = header && header.querySelector(".nav");

  if (header && nav && !header.querySelector(".nav-toggle")) {
    const btn = document.createElement("button");
    btn.className   = "nav-toggle";
    btn.setAttribute("aria-label", "Menú");
    btn.innerHTML   = "<span></span><span></span><span></span>";
    btn.addEventListener("click", () => {
      btn.classList.toggle("abierto");
      nav.classList.toggle("abierto");
    });
    // Insertar antes del nav
    header.insertBefore(btn, nav);
  }

  // Cerrar menú al hacer click en un link
  if (nav) {
    nav.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        nav.classList.remove("abierto");
        const toggle = header.querySelector(".nav-toggle");
        if (toggle) toggle.classList.remove("abierto");
      });
    });
  }
});


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


// ============================================================
// SLIDERS POLIDEPORTIVO
// FIX: cada slider calcula su propio paso en base al ancho
// real del primer elemento visible, para que funcione tanto
// en desktop (2 imgs) como en mobile (1 img).
// ============================================================

function getPaso(sliderId, itemClass) {
  const slider = document.getElementById(sliderId);
  if (!slider) return 0;
  const item = slider.querySelector("." + itemClass);
  if (!item) return 0;
  const gap = 20;
  return item.offsetWidth + gap;
}

function getMaxPos(sliderId) {
  const slider = document.getElementById(sliderId);
  if (!slider) return 0;
  const contenedor = slider.parentElement;
  return Math.max(0, slider.scrollWidth - contenedor.clientWidth);
}

// ---- Fútbol ----
let index = 0;
function moverSlider(direccion) {
  const paso   = getPaso("slider", "slider-item");
  const maxPos = getMaxPos("slider");
  index = Math.max(0, Math.min(index + direccion * paso, maxPos));
  document.getElementById("slider").style.transform = `translateX(-${index}px)`;
}

// ---- Inferiores ----
let indexInferiores = 0;
function moverSliderInferiores(direccion) {
  const paso   = getPaso("inferiores", "slider-inferiores");
  const maxPos = getMaxPos("inferiores");
  indexInferiores = Math.max(0, Math.min(indexInferiores + direccion * paso, maxPos));
  document.getElementById("inferiores").style.transform = `translateX(-${indexInferiores}px)`;
}

// ---- Voley ----
let indexVoley = 0;
function moverSliderVoley(direccion) {
  const paso   = getPaso("voley", "slider-voley");
  const maxPos = getMaxPos("voley");
  indexVoley = Math.max(0, Math.min(indexVoley + direccion * paso, maxPos));
  document.getElementById("voley").style.transform = `translateX(-${indexVoley}px)`;
}

// ---- Hockey ----
let indexHockey = 0;
function moverSliderHockey(direccion) {
  const paso   = getPaso("hockey", "slider-hockey");
  const maxPos = getMaxPos("hockey");
  indexHockey = Math.max(0, Math.min(indexHockey + direccion * paso, maxPos));
  document.getElementById("hockey").style.transform = `translateX(-${indexHockey}px)`;
}

// ---- Futsal ----
let indexFutsal = 0;
function moverSliderFutsal(direccion) {
  const paso   = getPaso("futsal", "slider-futsal");
  const maxPos = getMaxPos("futsal");
  indexFutsal = Math.max(0, Math.min(indexFutsal + direccion * paso, maxPos));
  document.getElementById("futsal").style.transform = `translateX(-${indexFutsal}px)`;
}

// ---- Handball ----
let indexHandball = 0;
function moverSliderHandball(direccion) {
  const paso   = getPaso("handball", "slider-handball");
  const maxPos = getMaxPos("handball");
  indexHandball = Math.max(0, Math.min(indexHandball + direccion * paso, maxPos));
  document.getElementById("handball").style.transform = `translateX(-${indexHandball}px)`;
}

// FIX: resetear todos los sliders al redimensionar
window.addEventListener("resize", () => {
  index           = 0;
  indexInferiores = 0;
  indexVoley      = 0;
  indexHockey     = 0;
  indexFutsal     = 0;
  indexHandball   = 0;

  ["slider","inferiores","voley","hockey","futsal","handball"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.transform = "translateX(0)";
  });
});