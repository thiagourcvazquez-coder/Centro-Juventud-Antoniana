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

// ================= SLIDER POLIDEPORTIVO =================

let index = 0;

function moverSlider(direccion) {
  const slider = document.getElementById("slider");
  const total = document.querySelectorAll(".slider-item").length;

  index += direccion;

  // límite (de a pares)
  if (index < 0) index = Math.ceil(total / 2) - 1;
  if (index >= Math.ceil(total / 2)) index = 0;

  slider.style.transform = `translateX(-${index * 100}%)`;
}

// Inferiores

let indexInferiores = 0;

function moverSliderInferiores(direccion) {
  const slider = document.getElementById("inferiores");
  const total = document.querySelectorAll(".slider-inferiores").length;

  indexInferiores += direccion;

  // límite (de a pares)
  if (indexInferiores < 0) indexInferiores = Math.ceil(total / 2) - 1;
  if (indexInferiores >= Math.ceil(total / 2)) indexInferiores = 0;

  slider.style.transform = `translateX(-${indexInferiores * 100}%)`;
}

// Voley

let indexVoley = 0;

function moverSliderVoley(direccion) {
  const slider = document.getElementById("voley");
  const total = document.querySelectorAll(".slider-voley").length;

  indexVoley += direccion;

  //límite (de a pares)
  if (indexVoley < 0) indexVoley = Math.ceil(total / 2) - 1;
  if (indexVoley >= Math.ceil(total / 2)) indexVoley = 0;

  slider.style.transform = `translateX(-${indexVoley * 100}%)`;
}

// Hockey

let indexHockey = 0;

function moverSliderHockey(direccion) {
  const slider = document.getElementById("hockey");
  const total = document.querySelectorAll(".slider-hockey").length;

  indexHockey += direccion;

  //límite (de a pares)
  if (indexHockey < 0) indexHockey = Math.ceil(total / 2) - 1;
  if (indexHockey >= Math.ceil(total / 2)) indexHockey = 0;

  slider.style.transform = `translateX(-${indexHockey * 100}%)`;
}

// Futsal

let indexFutsal = 0;

function moverSliderFutsal(direccion) {
  const slider = document.getElementById("futsal");
  const total = document.querySelectorAll(".slider-futsal").length;

  indexFutsal += direccion;

  //límite (de a pares)
  if (indexFutsal < 0) indexFutsal = Math.ceil(total / 2) - 1;
  if (indexFutsal >= Math.ceil(total / 2)) indexFutsal = 0;

  slider.style.transform = `translateX(-${indexFutsal * 100}%)`;
}

// Handball

let indexHandball = 0;

function moverSliderHandball(direccion) {
  const slider = document.getElementById("handball");
  const total = document.querySelectorAll(".slider-handball").length;

  indexHandball += direccion;

  //límite (de a pares)
  if (indexHandball < 0) indexHandball = Math.ceil(total / 2) - 1;
  if (indexHandball >= Math.ceil(total / 2)) indexHandball = 0;

  slider.style.transform = `translateX(-${indexHandball * 100}%)`;
}