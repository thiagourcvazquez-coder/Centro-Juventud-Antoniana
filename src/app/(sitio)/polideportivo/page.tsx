import type { Metadata } from 'next'
import ImageSlider from '@/components/ImageSlider'

export const metadata: Metadata = {
  title: 'Polideportivo - Centro Juventud Antoniana',
}

export default function PolideportivoPage() {
  return (
    <section id="polideportivo" className="section">
      <h1>Nuestras Disciplinas</h1>
      <div className="polideportivo-contenido">
        <h2>Futbol Masculino y Femenino</h2>
        <ImageSlider
          itemClass="slider-item"
          boxClass="polideportivo-box"
          imagenes={[
            { src: '/images/futbol.jpg', alt: 'Futbol Masculino' },
            { src: '/images/futbol2.jpg', alt: 'Futbol Masculino' },
            { src: '/images/femenino.webp', alt: 'Futbol Femenino' },
            { src: '/images/femenino2.webp', alt: 'Futbol Femenino' },
          ]}
        />

        <h3>Escuela de Futbol</h3>
        <ImageSlider
          itemClass="slider-inferiores"
          boxClass="inferiores-box"
          imagenes={[
            { src: '/images/inferiores3.jpg', alt: 'Escuela de Futbol' },
            { src: '/images/inferiores4.jpg', alt: 'Escuela de Futbol' },
            { src: '/images/inferiores.jpg', alt: 'Escuela de Futbol' },
            { src: '/images/inferiores2.jpg', alt: 'Escuela de Futbol' },
          ]}
        />

        <h4>Voley</h4>
        <ImageSlider
          itemClass="slider-voley"
          boxClass="voley-box"
          imagenes={[
            { src: '/images/voley1.jpg', alt: 'Voley' },
            { src: '/images/voley2.jpg', alt: 'Voley' },
            { src: '/images/voley3.jpg', alt: 'Voley' },
            { src: '/images/voley4.jpg', alt: 'Voley' },
          ]}
        />

        <h5>Hockey</h5>
        <ImageSlider
          itemClass="slider-hockey"
          boxClass="hockey-box"
          imagenes={[
            { src: '/images/hockey1.jpg', alt: 'Hockey' },
            { src: '/images/hockey2.jpg', alt: 'Hockey' },
            { src: '/images/hockey3.jpg', alt: 'Hockey' },
            { src: '/images/hockey4.jpg', alt: 'Hockey' },
          ]}
        />

        <h6>Futsal</h6>
        <ImageSlider
          itemClass="slider-futsal"
          boxClass="futsal-box"
          imagenes={[
            { src: '/images/futsal.jpg', alt: 'Futsal' },
            { src: '/images/futsal2.jpg', alt: 'Futsal' },
            { src: '/images/futsal3.jpg', alt: 'Futsal' },
            { src: '/images/futsal4.jpg', alt: 'Futsal' },
          ]}
        />

        <h6>Handball</h6>
        <ImageSlider
          itemClass="slider-handball"
          boxClass="handball-box"
          imagenes={[
            { src: '/images/handball.jpg', alt: 'Handball' },
            { src: '/images/handball2.jpg', alt: 'Handball' },
            { src: '/images/handball3.jpg', alt: 'Handball' },
            { src: '/images/handball4.jpg', alt: 'Handball' },
          ]}
        />
      </div>
    </section>
  )
}
