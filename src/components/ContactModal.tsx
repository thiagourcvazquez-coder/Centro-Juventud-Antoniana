'use client'

import { useToast } from '@/context/ToastContext'

export default function ContactModal({
  abierto,
  onCerrar,
}: {
  abierto: boolean
  onCerrar: () => void
}) {
  const { mostrarToast } = useToast()

  return (
    <div
      id="modal-contacto"
      className={`modal-overlay${abierto ? ' abierto' : ''}`}
      onClick={e => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className="modal-box">
        <h2>¡Contactate con nosotros!</h2>
        <form
          id="form-contacto"
          action="https://formsubmit.co/thiagovazquezalm@gmail.com"
          method="POST"
          onSubmit={() => {
            mostrarToast('✅ Mensaje enviado correctamente')
            onCerrar()
          }}
        >
          <label htmlFor="contacto-nombre">Nombre</label>
          <input
            type="text"
            id="contacto-nombre"
            name="nombre"
            placeholder="Tu nombre"
            required
          />
          <label htmlFor="contacto-email">Correo Electrónico</label>
          <input
            type="email"
            id="contacto-email"
            name="email"
            placeholder="Tu correo electrónico"
            required
          />
          <label htmlFor="contacto-mensaje">Mensaje</label>
          <textarea
            id="contacto-mensaje"
            name="mensaje"
            placeholder="Escribe tu mensaje aquí..."
            required
          />
          <input type="hidden" name="_captcha" value="false" />
          <button type="submit" className="btn-enviar">
            Enviar
          </button>
        </form>
        <button className="btn-cerrar-modal" onClick={onCerrar}>
          ✕ Cerrar
        </button>
      </div>
    </div>
  )
}
