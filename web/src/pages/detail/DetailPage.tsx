import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  Bath,
  BedDouble,
  Car,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Share2,
  ChevronLeft,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Map as MapIcon,
  X,
} from 'lucide-react'
import { useEffect } from 'react'
import { supabase } from '../../shared/lib/supabaseClient'
import { PropertyCard } from '../../modules/properties/components/PropertyCard'
import type { Property } from '../../modules/properties/types'
import { getPropertyGalleryImages, normalizePropertyImages } from '../../modules/properties/utils/images'
import { useSavedProperties } from '../../modules/properties/hooks/useSavedProperties'
import { formatPrice } from '../../shared/lib/formatPrice'
import { Button } from '../../shared/ui/button'
import { Card, CardContent } from '../../shared/ui/card'
import { Input } from '../../shared/ui/input'
import { Textarea } from '../../shared/ui/textarea'

import type { SearchFilters } from '../../modules/search/types'

type DetailPageProps = {
  property: Property
  onBack: () => void
  filters: SearchFilters
  onChangeFilters: (filters: SearchFilters) => void
}

export function DetailPage({ property, onBack, filters, onChangeFilters }: DetailPageProps) {
  const [copied, setCopied] = useState(false)
  const { isSaved, toggleSave } = useSavedProperties()
  
  const saved = isSaved(property.id)

  const locationParts = property.location ? property.location.split(',').map(s => s.trim()) : []
  let province = ''
  let municipality = ''
  let neighborhood = ''
  
  if (locationParts.length >= 4) {
    province = locationParts[3]
    municipality = locationParts[2]
    neighborhood = locationParts[1]
  } else if (locationParts.length === 3) {
    province = locationParts[2]
    municipality = locationParts[1]
    neighborhood = locationParts[0]
  } else if (locationParts.length === 2) {
    province = locationParts[1]
    municipality = locationParts[0]
  } else if (locationParts.length === 1) {
    province = locationParts[0]
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function scrollToContact() {
    document.getElementById('contactar-anunciante')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="detail-section" id="detalle">
      <div className="detail-shell max-w-7xl mx-auto px-4 py-3 md:py-5">
        
        {/* Navegacion y Acciones Superiores */}
        <div className="detail-heading flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="detail-nav flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onBack}
              className="detail-back inline-flex w-fit items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-700 transition-colors duration-200"
            >
              <ChevronLeft size={16} />
              Regresar a la búsqueda
            </button>
            <div className="detail-breadcrumbs flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-neutral-500">
              <span className="hover:text-emerald-800 cursor-pointer" onClick={() => {
                onChangeFilters({ query: '', operations: [], propertyType: 'all', zoneId: 'all' })
                onBack()
              }}>
                Inicio
              </span>
              
              {province && (
                <>
                  <span className="text-neutral-300">/</span>
                  <span 
                    className="hover:text-emerald-800 cursor-pointer" 
                    onClick={() => {
                      onChangeFilters({ ...filters, query: province })
                      onBack()
                    }}
                  >
                    {province}
                  </span>
                </>
              )}

              {municipality && (
                <>
                  <span className="text-neutral-300">/</span>
                  <span 
                    className="hover:text-emerald-800 cursor-pointer" 
                    onClick={() => {
                      onChangeFilters({ ...filters, query: `${municipality}, ${province}` })
                      onBack()
                    }}
                  >
                    {municipality}
                  </span>
                </>
              )}

              {neighborhood && (
                <>
                  <span className="text-neutral-300">/</span>
                  <span 
                    className="hover:text-emerald-800 cursor-pointer" 
                    onClick={() => {
                      onChangeFilters({ ...filters, query: `${neighborhood}, ${municipality}` })
                      onBack()
                    }}
                  >
                    {neighborhood}
                  </span>
                </>
              )}

              <span className="text-neutral-300">/</span>
              <span 
                className="hover:text-emerald-800 cursor-pointer" 
                onClick={() => {
                  const ops = property.operation === 'alquiler' ? ['alquiler'] : property.operation === 'venta' ? ['venta'] : ['permuta']
                  onChangeFilters({ ...filters, operations: ops as any })
                  onBack()
                }}
              >
                {property.operation === 'alquiler' ? 'Renta' : property.operation === 'venta' ? 'Venta' : 'Permuta'}
              </span>

              <span className="text-neutral-300">/</span>
              <span 
                className="hover:text-emerald-800 cursor-pointer" 
                onClick={() => {
                  onChangeFilters({ ...filters, propertyType: property.propertyType })
                  onBack()
                }}
              >
                {property.propertyType === 'apartamento' ? 'Departamentos' : property.propertyType === 'casa' ? 'Casas' : 'Terrenos'}
              </span>
            </div>
          </div>
          <div className="detail-actions flex items-center gap-2 w-full md:w-auto">
            <Button
              type="button"
              variant="outline"
              aria-label={saved ? 'Quitar de guardados' : 'Guardar propiedad'}
              onClick={() => toggleSave(property.id)}
              className={`detail-action-button flex-1 md:flex-initial flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-neutral-200 hover:bg-neutral-50 text-xs font-bold transition-colors duration-200 ${saved ? 'text-red-600 bg-red-50/50 border-red-100 hover:bg-red-50' : 'text-neutral-700'}`}
            >
              <Heart size={14} className={saved ? 'fill-red-500 text-red-500' : 'text-neutral-500'} />
              <span className="detail-action-label">{saved ? 'Guardado' : 'Guardar'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="Compartir propiedad"
              onClick={handleShare}
              className="detail-action-button flex-1 md:flex-initial flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors duration-200"
            >
              <Share2 size={14} className="text-neutral-500" />
              <span className="detail-action-label">{copied ? 'Copiado' : 'Compartir'}</span>
            </Button>
          </div>
        </div>

        <button type="button" className="mobile-verify-strip">
          Verificar cuenta
          <span aria-hidden="true">▼</span>
        </button>

        {/* Estructura Principal en 2 Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: Informacion de Inmueble (Col-span 2) */}
          <div className="detail-main-column lg:col-span-2 space-y-6">
            
            {/* Cabecera del Inmueble */}
            <div className="detail-hero-copy">
              <div className="detail-badges flex items-center gap-2 mb-2">
                <span className="text-[10px] tracking-wider uppercase font-bold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded">
                  {property.propertyType}
                </span>
                <span className="text-[10px] tracking-wider uppercase font-bold bg-[#035f53]/10 text-[#035f53] px-2.5 py-1 rounded">
                  {property.operation}
                </span>
              </div>
              <h1 className="detail-title text-2xl md:text-3xl font-extrabold text-neutral-900 leading-tight mb-2">
                {property.title}
              </h1>
              
              <div className="detail-meta flex items-center gap-3 mb-4 text-xs font-bold text-neutral-400">
                {null}
                {property.ageYears && (
                  <>
                    <span className="hidden">|</span>
                    <span>Antigüedad: {property.ageYears} años</span>
                  </>
                )}
              </div>

              <p className="detail-location-line flex items-center gap-2 text-sm text-neutral-500 mb-4">
                <MapPin size={16} className="text-[#035f53] shrink-0" />
                {property.location}
              </p>
              <p className="detail-price-line text-3xl font-black text-[#035f53]">
                {property.operation === 'permuta'
                  ? 'Permuta'
                  : `${formatPrice(property.priceUsd)} USD`}
              </p>
            </div>

            {/* Galería de Fotos Interactiva */}
            <ImageGallery property={property} />

            {/* Ficha Técnica / Especificaciones */}
            <div className="bg-white border border-neutral-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-4">
                Características básicas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Feature icon={<BedDouble size={20} className="text-[#035f53]" />} label="Recámaras" value={Math.floor(property.bedrooms)} />
                <Feature icon={<Bath size={20} className="text-[#035f53]" />} label="Baños" value={Math.floor(property.bathrooms)} />
                <Feature icon={<Car size={20} className="text-[#035f53]" />} label="Estacionamientos" value={property.parking} />
                <Feature icon={<Ruler size={20} className="text-[#035f53]" />} label="Área total" value={`${property.areaM2} m²`} />
              </div>
            </div>

            {/* Descripción */}
            <Card className="border border-neutral-100 rounded-xl shadow-sm overflow-hidden">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">
                  Descripción
                </h3>
                <p className="text-neutral-600 text-sm md:text-base leading-relaxed whitespace-pre-line max-w-3xl">
                  {property.description}
                </p>
              </CardContent>
            </Card>

            {/* Amenidades */}
            {property.amenities && property.amenities.length > 0 && (
              <Card className="border border-neutral-100 rounded-xl shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-4">
                    Amenidades y Servicios
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2 text-sm text-neutral-600">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ubicación y Seguridad */}
            <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-100 flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="p-3 bg-emerald-100 rounded-full text-emerald-800 shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-800">Ubicación aproximada protegida</h4>
                <p className="text-xs text-neutral-500 leading-normal mt-0.5">
                  Por seguridad y privacidad del propietario, no mostramos la ubicación exacta. Al contactar al anunciante recibirás la información precisa y agendarás una visita controlada.
                </p>
              </div>
            </div>

          </div>

          {/* Columna Derecha: Tarjeta de Contacto (Sticky) */}
          <div className="space-y-6">
            <ContactCard property={property} />
          </div>

        </div>
      </div>

      {/* Mapa de Ubicación */}
      <div className="detail-map-section max-w-7xl mx-auto px-4 mt-8">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
            <div className="p-2 bg-[#035f53]/10 rounded-lg">
              <MapIcon size={18} className="text-[#035f53]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Ubicación aproximada</h3>
              <p className="text-[11px] text-neutral-500">{property.location}</p>
            </div>
          </div>
          <div className="w-full h-[300px] md:h-[400px]">
            <iframe
              title="Ubicación de la propiedad"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.coordinates.longitude - 0.01}%2C${property.coordinates.latitude - 0.008}%2C${property.coordinates.longitude + 0.01}%2C${property.coordinates.latitude + 0.008}&layer=mapnik&marker=${property.coordinates.latitude}%2C${property.coordinates.longitude}`}
            />
          </div>
        </div>
      </div>

      {/* Propiedades Similares */}
      <div className="detail-similar-section max-w-7xl mx-auto px-4 pb-12 mt-8">
        <SimilarProperties currentProperty={property} />
      </div>

      <div className="mobile-detail-cta" aria-label="Acciones de contacto">
        <button type="button" className="mobile-detail-cta-icon" onClick={scrollToContact} aria-label="Llamar o ver telefono">
          <Phone size={16} />
        </button>
        <button type="button" className="mobile-detail-cta-secondary" onClick={scrollToContact}>
          Contactar
        </button>
        <button type="button" className="mobile-detail-cta-primary" onClick={scrollToContact}>
          <MessageCircle size={16} />
          Consultar
        </button>
      </div>
    </section>
  )
}

/* Subcomponente: Galeria de Imagenes (Airbnb-style Collage layout) */
function ImageGallery({ property }: { property: Property }) {
  const [activeImage, setActiveImage] = useState<string>(property.coverImage || '')
  const [isOpenModal, setIsOpenModal] = useState(false)

  const images = getPropertyGalleryImages(property.coverImage, property.images)

  return (
    <div className="detail-gallery space-y-4">
      {/* Grid de collage premium para pantallas grandes, fallback a slider en movil */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-3 aspect-[21/9] rounded-2xl overflow-hidden shadow-md border border-neutral-100">
        
        {/* Foto principal grande */}
        <div 
          onClick={() => { setActiveImage(images[0]); setIsOpenModal(true); }}
          className="col-span-2 row-span-2 bg-cover bg-center cursor-pointer hover:opacity-95 transition-opacity relative group"
          style={{ backgroundImage: `url("${images[0]}")`, backgroundColor: property.coverTone || '#f3f4f6' }}
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
        </div>

        {/* Fotos laterales */}
        {images.slice(1, 5).map((img, idx) => (
          <div 
            key={idx}
            onClick={() => { setActiveImage(img); setIsOpenModal(true); }}
            className="bg-cover bg-center cursor-pointer hover:opacity-95 transition-opacity relative group"
            style={{ backgroundImage: `url("${img}")` }}
          >
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            {idx === 3 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-black">
                +{images.length - 4} fotos
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Slider movil */}
      <div className="mobile-detail-gallery block md:hidden space-y-2">
        <div
          className="mobile-detail-gallery-main relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-md"
          style={
            {
              backgroundColor: property.coverTone || '#f3f4f6',
              backgroundImage: `url("${activeImage || images[0]}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } as CSSProperties
          }
        >
          <button type="button" className="mobile-gallery-button" onClick={() => setIsOpenModal(true)}>
            Ver Galería
          </button>
        </div>
        <div className="mobile-detail-gallery-thumbs flex gap-2 overflow-x-auto py-1 scrollbar-none">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveImage(img)}
              className={`mobile-detail-gallery-thumb relative w-16 aspect-[4/3] rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                activeImage === img ? 'border-[#035f53] scale-95' : 'border-transparent opacity-75'
              }`}
            >
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${img}")` }} />
            </button>
          ))}
        </div>
      </div>

      {/* Modal visor de pantalla completa */}
      {isOpenModal && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpenModal(false) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsOpenModal(false) }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <button 
            onClick={() => setIsOpenModal(false)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors z-10"
            aria-label="Cerrar galeria"
          >
            <X size={22} />
          </button>
          
          <img 
            src={activeImage} 
            alt="Detalle de propiedad" 
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl animate-scaleUp"
          />

          <div className="flex gap-2 mt-6 overflow-x-auto max-w-full py-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`relative w-20 aspect-[4/3] rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  activeImage === img ? 'border-emerald-500 scale-95 shadow' : 'border-transparent opacity-50'
                }`}
              >
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${img}")` }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* Subcomponente: Tarjeta de Contacto */
function ContactCard({ property }: { property: Property }) {
  const [contactSent, setContactSent] = useState(false)

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    setContactSent(true)
    setTimeout(() => setContactSent(false), 4000)
  }

  return (
    <Card id="contactar-anunciante" className="border border-neutral-100 rounded-2xl shadow-xl p-6 sticky top-6 bg-white">
      <CardContent className="p-0 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 mb-1">
            Contactar anunciante
          </h3>
          <p className="text-xs text-neutral-500 flex items-center gap-1.5">
            <Calendar size={13} />
            Publicado recientemente
          </p>
        </div>

        {contactSent ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-sm text-center font-medium animate-fadeIn">
            Mensaje enviado con éxito. El anunciante se pondrá en contacto a la brevedad.
          </div>
        ) : (
          <form onSubmit={handleContactSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Tu mensaje
              </label>
              <Textarea
                required
                defaultValue={`Hola, estoy interesado en "${property.title}" en ${property.location}. Quisiera recibir más detalles.`}
                className="text-xs text-neutral-700 min-h-[90px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Nombre completo
              </label>
              <Input required placeholder="Escribe tu nombre" className="text-xs" />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Teléfono o WhatsApp
              </label>
              <Input required type="tel" placeholder="+53 50000000" className="text-xs" />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 text-xs font-bold flex items-center justify-center gap-2 mt-4 transition-colors duration-200"
            >
              <Phone size={14} />
              Enviar mensaje y ver contacto
            </Button>
          </form>
        )}
      </CardContent>

      <div className="border-t border-neutral-100 mt-5 pt-4 text-center">
        <button className="inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 hover:text-red-500 transition-colors">
          <AlertTriangle size={14} />
          Reportar propiedad sospechosa
        </button>
      </div>
    </Card>
  )
}

/* Subcomponente Auxiliar: Especificacion */
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
    <div className="flex flex-col items-center justify-center p-3.5 bg-neutral-50 rounded-lg text-center border border-neutral-100/50">
      <div className="mb-2">{icon}</div>
      <strong className="text-sm font-extrabold text-neutral-800 leading-tight">
        {value}
      </strong>
      <span className="text-[10px] font-semibold text-neutral-400 mt-0.5">
        {label}
      </span>
    </div>
  )
}

/* Subcomponente: Propiedades Similares */
function SimilarProperties({ currentProperty }: { currentProperty: Property }) {
  const [similar, setSimilar] = useState<Property[]>([])
  
  const locationParts = currentProperty.location ? currentProperty.location.split(',').map(s => s.trim()) : []
  const province = locationParts.length >= 4 ? locationParts[3] : (locationParts.length === 3 ? locationParts[2] : (locationParts.length === 2 ? locationParts[1] : ''))

  useEffect(() => {
    async function fetchSimilar() {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('property_type', currentProperty.propertyType)
        .eq('operation', currentProperty.operation)
        .neq('id', currentProperty.id)

      if (province) {
        query = query.ilike('location', `%${province}%`)
      }

      let { data } = await query.limit(3)
      
      if (data && data.length < 3) {
        const excludeIds = [currentProperty.id, ...data.map((item: any) => item.id)]
        const { data: fallbackData } = await supabase
          .from('properties')
          .select('*')
          .eq('property_type', currentProperty.propertyType)
          .eq('operation', currentProperty.operation)
          .not('id', 'in', `(${excludeIds.map(id => `'${id}'`).join(',')})`)
          .limit(3 - data.length)
          
        if (fallbackData) {
          data = [...data, ...fallbackData]
        }
      }
        
      if (data) {
        const mapped = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            location: item.location,
            description: item.description,
            zoneId: item.zone_id,
            operation: item.operation,
            propertyType: item.property_type,
            priceUsd: item.price_usd ? Number(item.price_usd) : undefined,
            bedrooms: Number(item.bedrooms),
            bathrooms: Number(item.bathrooms),
            parking: Number(item.parking),
            areaM2: Number(item.area_m2),
            ageYears: item.age_years ? Number(item.age_years) : undefined,
            amenities: item.amenities || [],
            badge: item.badge || undefined,
            status: item.status,
            coverTone: item.cover_tone || '#f3f4f6',
            coverImage: item.cover_image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
            images: normalizePropertyImages(item.images),
            mapPoint: { x: 300, y: 200 },
            coordinates: item.coordinates || { latitude: 23.1136, longitude: -82.3666 }
        }))
        setSimilar(mapped)
      }
    }
    fetchSimilar()
  }, [currentProperty.id])
  
  if (similar.length === 0) return null
  
  return (
    <div className="mt-12 border-t border-neutral-200 pt-10">
      <h3 className="text-xl font-bold text-neutral-900 mb-6">
        Más {currentProperty.propertyType === 'apartamento' ? 'departamentos' : currentProperty.propertyType === 'casa' ? 'casas' : 'terrenos'} en {currentProperty.operation === 'alquiler' ? 'renta' : currentProperty.operation === 'venta' ? 'venta' : 'permuta'} {province ? `en ${province}` : ''}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {similar.map(prop => (
          <PropertyCard 
            key={prop.id} 
            property={prop} 
            isSelected={false}
            onSelect={() => {
              const typeStr = prop.propertyType === 'apartamento' ? 'apartamento' : prop.propertyType === 'casa' ? 'casa' : 'terreno'
              const opStr = prop.operation === 'alquiler' ? 'renta' : prop.operation === 'venta' ? 'venta' : 'permuta'
              const cleanLoc = prop.location
                ? prop.location
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
                : 'cuba'
              const slug = `${typeStr}-en-${opStr}-en-${cleanLoc}-${prop.id}`
              window.history.pushState(null, '', `/propiedad/${slug}`)
              window.dispatchEvent(new Event('popstate'))
            }} 
          />
        ))}
      </div>
    </div>
  )
}

