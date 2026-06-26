import type { CSSProperties, ReactNode } from 'react'
import {
  Bath,
  BedDouble,
  Car,
  Heart,
  MapPin,
  MessageCircle,
  Ruler,
  ShieldCheck,
} from 'lucide-react'
import { formatPrice } from '../../../shared/lib/formatPrice'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Card, CardContent } from '../../../shared/ui/card'
import type { Property } from '../types'

type PropertyCardDesignLabProps = {
  properties: Property[]
}

const designLabels = [
  'A. Visual marketplace',
  'B. Lista comparativa',
  'C. Premium editorial',
  'D. Compacta operativa',
]

export function PropertyCardDesignLab({
  properties,
}: PropertyCardDesignLabProps) {
  const demoProperties = properties.slice(0, 4)

  return (
    <section className="card-lab-section" id="tarjetas">
      <div className="card-lab-heading">
        <div>
          <p className="eyebrow">Exploracion visual</p>
          <h2>Propuestas de tarjetas de propiedades</h2>
        </div>
        <p>
          Cuatro direcciones para elegir el lenguaje final del listado antes de
          conectar datos reales.
        </p>
      </div>

      <div className="card-lab-grid">
        {demoProperties.map((property, index) => (
          <Card
            className={`card-lab-option card-lab-option-${index + 1}`}
            key={property.id}
          >
            <CardContent className="card-lab-content">
              <span className="card-lab-label">{designLabels[index]}</span>
              {index === 0 ? <VisualMarketplaceCard property={property} /> : null}
              {index === 1 ? <ComparativeListCard property={property} /> : null}
              {index === 2 ? <PremiumEditorialCard property={property} /> : null}
              {index === 3 ? <CompactOperationalCard property={property} /> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function VisualMarketplaceCard({ property }: { property: Property }) {
  const priceLabel = getPriceLabel(property)

  return (
    <article className="demo-card demo-card-market">
      <PropertyImage property={property} className="demo-market-photo">
        <button className="demo-save-button" type="button" aria-label="Guardar">
          <Heart size={17} />
        </button>
        {property.badge ? <Badge className="demo-photo-badge">{property.badge}</Badge> : null}
      </PropertyImage>
      <div className="demo-card-body">
        <div className="demo-card-row">
          <strong>{property.title}</strong>
          <span>{priceLabel}</span>
        </div>
        <p>
          <MapPin size={14} />
          {property.location}
        </p>
        <SpecRow property={property} />
      </div>
    </article>
  )
}

function ComparativeListCard({ property }: { property: Property }) {
  const priceLabel = getPriceLabel(property)

  return (
    <article className="demo-card demo-card-list">
      <PropertyImage property={property} className="demo-list-photo" />
      <div className="demo-card-body">
        <div className="demo-card-row">
          <span className="demo-operation-pill">{property.operation}</span>
          <strong>{priceLabel}</strong>
        </div>
        <h3>{property.title}</h3>
        <p>
          <MapPin size={14} />
          {property.location}
        </p>
        <SpecRow property={property} />
        <Button className="demo-wide-action" type="button" size="sm">
          <MessageCircle size={15} />
          Contactar anunciante
        </Button>
      </div>
    </article>
  )
}

function PremiumEditorialCard({ property }: { property: Property }) {
  const priceLabel = getPriceLabel(property)

  return (
    <article className="demo-card demo-card-premium">
      <PropertyImage property={property} className="demo-premium-photo">
        <span className="demo-premium-tag">
          <ShieldCheck size={15} />
          Verificada
        </span>
      </PropertyImage>
      <div className="demo-premium-body">
        <span>{property.propertyType}</span>
        <h3>{property.title}</h3>
        <p>{property.description}</p>
        <div className="demo-premium-footer">
          <strong>{priceLabel}</strong>
          <Button type="button" size="sm" variant="outline">
            Ver ficha
          </Button>
        </div>
      </div>
    </article>
  )
}

function CompactOperationalCard({ property }: { property: Property }) {
  const priceLabel = getPriceLabel(property)

  return (
    <article className="demo-card demo-card-compact">
      <PropertyImage property={property} className="demo-compact-photo" />
      <div className="demo-card-body">
        <div className="demo-card-row">
          <strong>{priceLabel}</strong>
          <span className="demo-operation-pill">{property.propertyType}</span>
        </div>
        <h3>{property.title}</h3>
        <p>
          <MapPin size={14} />
          {property.location}
        </p>
        <div className="demo-compact-line">
          {property.bedrooms} hab
          <span />
          {property.bathrooms} bano
          <span />
          {property.areaM2} m2
        </div>
      </div>
    </article>
  )
}

function getPriceLabel(property: Property) {
  if (property.operation === 'permuta') return 'Permuta'
  if (property.operation === 'alquiler') return `${formatPrice(property.priceUsd)} / mes`
  return formatPrice(property.priceUsd)
}

function PropertyImage({
  property,
  className,
  children,
}: {
  property: Property
  className: string
  children?: ReactNode
}) {
  return (
    <div
      className={className}
      style={
        {
          '--cover-tone': property.coverTone,
          '--cover-image': `url("${property.coverImage}")`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  )
}

function SpecRow({ property }: { property: Property }) {
  return (
    <div className="demo-spec-row">
      <span>
        <BedDouble size={14} />
        {property.bedrooms}
      </span>
      <span>
        <Bath size={14} />
        {property.bathrooms}
      </span>
      <span>
        <Car size={14} />
        {property.parking}
      </span>
      <span>
        <Ruler size={14} />
        {property.areaM2} m2
      </span>
    </div>
  )
}
