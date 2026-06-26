import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  Bath,
  BedDouble,
  Building2,
  Car,
  FileCheck,
  Heart,
  Map,
  MapPin,
  Newspaper,
  Phone,
  Ruler,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { PropertyCard } from '../modules/properties/components/PropertyCard'
import { featuredProperties } from '../modules/properties/data/featuredProperties'
import type { Property } from '../modules/properties/types'
import { filterProperties } from '../modules/properties/services/filterProperties'
import { PropertyMap } from '../modules/maps/components/PropertyMap'
import { SearchBar } from '../modules/search/components/SearchBar'
import type { SearchFilters } from '../modules/search/types'
import { formatPrice } from '../shared/lib/formatPrice'

const initialFilters: SearchFilters = {
  query: '',
  operation: 'all',
  propertyType: 'all',
  zoneId: 'all',
}

export function CubitatApp() {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>()

  const visibleProperties = useMemo(
    () => filterProperties(featuredProperties, filters),
    [filters],
  )

  const selectedProperty = visibleProperties.find(
    (property) => property.id === selectedPropertyId,
  )

  function handleSelectZone(zoneId: string) {
    setFilters((current) => ({
      ...current,
      zoneId: current.zoneId === zoneId ? 'all' : zoneId,
    }))
    setSelectedPropertyId(undefined)
  }

  function handleSelectProperty(propertyId: string) {
    setSelectedPropertyId(propertyId)
  }

  function handleClearFilters() {
    setFilters(initialFilters)
    setSelectedPropertyId(undefined)
  }

  function scrollTo(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Cubitat inicio">
          <span className="brand-mark">c</span>
          <span>Cubitat</span>
        </a>
        <nav className="primary-nav" aria-label="Navegacion principal">
          <a href="#resultados">Comprar</a>
          <a href="#resultados">Rentar</a>
          <a href="#publicar">Vender</a>
          <a href="#servicios">Servicios</a>
          <a href="#productos">Nuestros productos</a>
          <a href="#blog">Blog</a>
        </nav>
        <div className="header-actions">
          <button
            className="publish-button"
            type="button"
            onClick={() => scrollTo('publicar')}
          >
            Publicar gratis
          </button>
          <button
            className="login-button"
            type="button"
            onClick={() => scrollTo('login')}
          >
            Ingresar
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="hero-content">
          <p className="hero-kicker">Cubitat inmobiliaria</p>
          <h1>
            Buscalo en Cubitat.
            <span>El portal de propiedades para Cuba.</span>
          </h1>
          <SearchBar
            filters={filters}
            onChange={setFilters}
            onClear={handleClearFilters}
          />
        </div>
        <a className="scroll-cue" href="#resultados" aria-label="Ver resultados">
          <span />
        </a>
      </section>

      <section
        className="workspace"
        id="resultados"
        aria-label="Resultados y mapa"
      >
        <aside className="results-panel" aria-label="Resultados de propiedades">
          <div className="results-heading">
            <div>
              <p className="eyebrow">Resultados destacados</p>
              <h1>Propiedades en Cuba</h1>
            </div>
            <span className="results-count">{visibleProperties.length}</span>
          </div>

          <p className="results-summary">
            Encuentra viviendas por zona, compara precios y contacta al
            anunciante desde una busqueda clara y rapida.
          </p>

          {selectedProperty ? (
            <SelectedPropertyNotice property={selectedProperty} />
          ) : null}

          <div className="property-list">
            {visibleProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSelected={property.id === selectedPropertyId}
                onSelect={handleSelectProperty}
              />
            ))}
          </div>
        </aside>

        <section className="map-panel" aria-label="Mapa de propiedades">
          <PropertyMap
            properties={visibleProperties}
            selectedZoneId={filters.zoneId}
            selectedPropertyId={selectedPropertyId}
            onSelectZone={handleSelectZone}
            onSelectProperty={handleSelectProperty}
          />
        </section>
      </section>

      {selectedProperty ? (
        <PropertyDetail property={selectedProperty} />
      ) : (
        <PropertyDetail property={featuredProperties[0]} />
      )}

      <PopularLocations />
      <ServicesSection />
      <ProductsSection />
      <PublishSection />
      <LoginSection />
      <BlogSection />
      <SiteFooter />
    </main>
  )
}

function SelectedPropertyNotice({ property }: { property: Property }) {
  return (
    <div className="selected-notice">
      <strong>Seleccionada:</strong> {property.title}
    </div>
  )
}

function PropertyDetail({ property }: { property: Property }) {
  return (
    <section className="detail-section" id="detalle">
      <div className="detail-shell">
        <div className="detail-heading">
          <a href="#resultados">Regresar a la busqueda</a>
          <div className="detail-actions">
            <button type="button">
              <Heart size={18} />
              Guardar
            </button>
            <button type="button">
              <Share2 size={18} />
              Compartir
            </button>
          </div>
        </div>

        <div className="detail-grid">
          <div>
            <p className="eyebrow">{property.badge ?? 'propiedad'}</p>
            <h2>{property.title}</h2>
            <p className="detail-location">
              <MapPin size={18} />
              {property.location}
            </p>
            <p className="detail-price">
              {property.operation === 'permuta'
                ? 'Permuta'
                : formatPrice(property.priceUsd)}
            </p>

            <div className="gallery-grid" aria-label="Galeria de imagenes">
              {[0, 1, 2, 3, 4].map((item) => (
                <span
                  key={item}
                  className="gallery-tile"
                  style={
                    {
                      '--cover-tone': property.coverTone,
                      '--cover-image': `url("${property.coverImage}")`,
                    } as CSSProperties
                  }
                >
                  {item === 0 ? 'Ver galeria' : `+${item + 6}`}
                </span>
              ))}
            </div>

            <div className="detail-block">
              <h3>Descripcion</h3>
              <p>{property.description}</p>
            </div>

            <div className="feature-grid">
              <Feature icon={<BedDouble />} label="Recamaras" value={property.bedrooms} />
              <Feature icon={<Bath />} label="Banos" value={property.bathrooms} />
              <Feature icon={<Car />} label="Estacionamientos" value={property.parking} />
              <Feature icon={<Ruler />} label="Area construida" value={`${property.areaM2} m2`} />
            </div>

            <div className="detail-block">
              <h3>Amenidades y servicios</h3>
              <div className="amenity-list">
                {property.amenities.map((amenity) => (
                  <span key={amenity}>{amenity}</span>
                ))}
              </div>
            </div>
          </div>

          <aside className="contact-card">
            <p className="eyebrow">Contacta al anunciante</p>
            <h3>Envia tus datos</h3>
            <textarea
              readOnly
              value={`Hola, estoy interesado en ${property.title}. Favor de enviarme informacion adicional.`}
            />
            <input readOnly value="Nombre completo" />
            <input readOnly value="Telefono o WhatsApp" />
            <button type="button">
              <Phone size={18} />
              Contactar y ver telefono
            </button>
          </aside>
        </div>
      </div>
    </section>
  )
}

function Feature({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="feature-card">
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function PopularLocations() {
  const locations = [
    ['La Habana', '128 propiedades'],
    ['Santiago de Cuba', '42 propiedades'],
    ['Villa Clara', '36 propiedades'],
    ['Camaguey', '29 propiedades'],
    ['Holguin', '24 propiedades'],
    ['Cienfuegos', '18 propiedades'],
  ]

  return (
    <section className="content-section">
      <div className="section-heading">
        <p className="eyebrow">Busca por ubicacion</p>
        <h2>Encuentra inmuebles por provincia</h2>
      </div>
      <div className="location-grid">
        {locations.map(([name, count]) => (
          <a key={name} href="#resultados">
            <span>{name}</span>
            <strong>{count}</strong>
          </a>
        ))}
      </div>
    </section>
  )
}

function ServicesSection() {
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
        <Solution icon={<TrendingUp />} title="Avaluo estimado" text="Referencia rapida para publicar con un precio razonable." />
        <Solution icon={<Map />} title="Mapa de precios" text="Exploracion por zona con referencias claras y datos propios." />
        <Solution icon={<ShieldCheck />} title="Centro de confianza" text="Verificacion progresiva para reducir fraudes." />
      </div>
    </section>
  )
}

function ProductsSection() {
  return (
    <section className="content-section" id="productos">
      <div className="section-heading">
        <p className="eyebrow">Nuestros productos</p>
        <h2>Productos listos para hacer crecer el portal</h2>
      </div>
      <div className="product-row">
        <Solution icon={<Sparkles />} title="Destacados" text="Mas visibilidad para publicaciones prioritarias." />
        <Solution icon={<Building2 />} title="Micrositios" text="Vitrina profesional para agentes e inmobiliarias." />
        <Solution icon={<FileCheck />} title="Referidos" text="Enlaces medibles para captacion por agentes." />
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

function PublishSection() {
  return (
    <section className="publish-section" id="publicar">
      <div>
        <p className="eyebrow">Vender o rentar</p>
        <h2>Publica una propiedad en minutos</h2>
        <p>
          Captura fotos, ubicacion aproximada, precio, descripcion y datos de
          contacto para que cada anuncio llegue completo a revision.
        </p>
      </div>
      <form className="publish-form">
        <input readOnly value="Tipo de operacion" />
        <input readOnly value="Provincia o municipio" />
        <input readOnly value="Precio estimado" />
        <button type="button">Comenzar publicacion</button>
      </form>
    </section>
  )
}

function LoginSection() {
  return (
    <section className="login-section" id="login">
      <div>
        <p className="eyebrow">Cuenta Cubitat</p>
        <h2>Acceso para propietarios, compradores y administradores</h2>
      </div>
      <div className="login-card">
        <input readOnly value="Correo electronico" />
        <input readOnly value="Contrasena" />
        <button type="button">Ingresar</button>
        <a href="#publicar">Crear cuenta para publicar</a>
      </div>
    </section>
  )
}

function BlogSection() {
  const posts = [
    'Como preparar una propiedad antes de publicarla',
    'Que datos debe pedir Cubitat para evitar fraudes',
    'Como comparar precios por zona en Cuba',
  ]

  return (
    <section className="content-section" id="blog">
      <div className="section-heading">
        <p className="eyebrow">Blog</p>
        <h2>Guias inmobiliarias para usuarios y vendedores</h2>
      </div>
      <div className="blog-grid">
        {posts.map((post) => (
          <article key={post}>
            <Newspaper size={24} />
            <h3>{post}</h3>
            <p>Contenido editorial pensado para educar y generar confianza.</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <strong>Cubitat</strong>
      <span>Portal inmobiliario para Cuba</span>
    </footer>
  )
}
