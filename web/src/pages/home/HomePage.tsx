import { useMemo, type ReactNode } from 'react'
import {
  Building2,
  FileCheck,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { SearchBar } from '../../modules/search/components/SearchBar'
import { slugifySeo } from '../../modules/search/seoRoutes'
import type { LocationSuggestion, SearchFilters } from '../../modules/search/types'

type HomePageProps = {
  filters: SearchFilters
  locationSuggestions: LocationSuggestion[]
  onChangeFilters: (filters: SearchFilters) => void
  onClearFilters: () => void
  onSubmitSearch: () => void
}

export function HomePage({
  filters,
  locationSuggestions,
  onChangeFilters,
  onClearFilters,
  onSubmitSearch,
}: HomePageProps) {
  return (
    <>
      <section className="hero">
        <img
          className="hero-media"
          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=50"
          srcSet="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=45 800w, https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=50 1200w, https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=55 1600w"
          sizes="100vw"
          alt=""
          fetchPriority="high"
          decoding="async"
        />
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="hero-content">
          <p className="hero-kicker">Cubitat inmobiliaria</p>
          <h1>
            Búscalo en Cubitat.
            <span>El portal de propiedades para Cuba.</span>
          </h1>
          <SearchBar
            filters={filters}
            locationSuggestions={locationSuggestions}
            onChange={onChangeFilters}
            onClear={onClearFilters}
            onSubmitSearch={onSubmitSearch}
          />
        </div>
      </section>

      <PopularLocations />
      <ServicesSection />
      <ProductsSection />
    </>
  )
}

const POPULAR_LOCATIONS = [
  { province: 'Pinar del Río', image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=500&q=60' },
  { province: 'Artemisa', image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=500&q=60' },
  { province: 'La Habana', image: 'https://images.unsplash.com/photo-1500673922987-e212871fec22?auto=format&fit=crop&w=500&q=60' },
  { province: 'Mayabeque', image: 'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?auto=format&fit=crop&w=500&q=60' },
  { province: 'Matanzas', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=60' },
  { province: 'Cienfuegos', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=500&q=60' },
  { province: 'Villa Clara', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=500&q=60' },
  { province: 'Sancti Spíritus', image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=500&q=60' },
  { province: 'Ciego de Ávila', image: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=500&q=60' },
  { province: 'Camagüey', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=500&q=60' },
  { province: 'Las Tunas', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=500&q=60' },
  { province: 'Holguín', image: 'https://images.unsplash.com/photo-1570129476815-ba368ac77013?auto=format&fit=crop&w=500&q=60' },
  { province: 'Granma', image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=500&q=60' },
  { province: 'Santiago de Cuba', image: 'https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?auto=format&fit=crop&w=500&q=60' },
  { province: 'Guantánamo', image: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=500&q=60' },
  { province: 'Isla de la Juventud', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=60' },
]

export function PopularLocations() {
  const randomizedLocations = useMemo(() => {
    return [...POPULAR_LOCATIONS]
      .map((location) => ({ location, sortKey: Math.random() }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ location }) => location)
  }, [])

  return (
    <section className="content-section">
      <div className="section-heading-centered">
        <h2>El portal inmobiliario más grande de Cuba</h2>
        <p className="section-description">Compra, venta y renta de inmuebles en toda Cuba.</p>
      </div>
      <div className="location-grid-cards">
        {randomizedLocations.map(({ province, image }, index) => {
          const name = `Departamentos en venta en ${province}`
          const href = `/apartamentos-en-venta/${slugifySeo(province)}`
          
          return (
            <a
              key={province}
              className="location-card"
              href={href}
              onClick={(e) => {
                e.preventDefault()
                window.history.pushState(null, '', href)
                window.dispatchEvent(new Event('popstate'))
              }}
            >
              <img
                className="location-card-image"
                src={image}
                alt={province}
                loading={index < 8 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <div className="location-card-content">
                <h3>{name}</h3>
                <span className="location-card-action">Ver propiedades &rarr;</span>
              </div>
            </a>
          )
        })}
      </div>
    </section>
  )
}

export function ServicesSection() {
  return (
    <section className="content-section split-section" id="servicios">
      <div>
        <p className="eyebrow">Servicios</p>
        <h2>Herramientas para comprar, vender y comparar mejor</h2>
        <p>
          Cubitat puede crecer hacia valuacion, precios por zona y lectura del
          mercado con datos propios y una experiencia pensada para compradores
          reales.
        </p>
      </div>
      <div className="solution-grid">
        <Solution
          icon={<TrendingUp />}
          title="Avaluo estimado"
          text="Referencia rapida para publicar con un precio razonable."
        />
        <Solution
          icon={<MapPin />}
          title="Mapa de precios"
          text="Exploracion por zona con referencias claras y datos propios."
        />
        <Solution
          icon={<ShieldCheck />}
          title="Centro de confianza"
          text="Verificacion progresiva para reducir fraudes."
        />
      </div>
    </section>
  )
}

export function ProductsSection() {
  return (
    <section className="content-section" id="productos">
      <div className="section-heading">
        <p className="eyebrow">Nuestros productos</p>
        <h2>Productos listos para hacer crecer el portal</h2>
      </div>
      <div className="product-row">
        <Solution
          icon={<Sparkles />}
          title="Destacados"
          text="Mas visibilidad para publicaciones prioritarias."
        />
        <Solution
          icon={<Building2 />}
          title="Micrositios"
          text="Vitrina profesional para agentes e inmobiliarias."
        />
        <Solution
          icon={<FileCheck />}
          title="Referidos"
          text="Enlaces medibles para captacion por agentes."
        />
      </div>
    </section>
  )
}

function Solution({
  icon,
  title,
  text,
}: {
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <article className="solution-card">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  )
}

