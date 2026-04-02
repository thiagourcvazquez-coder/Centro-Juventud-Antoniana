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