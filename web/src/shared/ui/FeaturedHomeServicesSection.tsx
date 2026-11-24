import { useEffect, useState } from 'react'
import { fetchHomeServiceProviders } from '../../modules/home-services/homeServiceRepository'
import { HOME_SERVICE_CATEGORY_LABELS, type HomeServiceProvider } from '../../modules/home-services/types'
import { CatalogCardFrame } from './CatalogCardFrame'
import { CatalogCardGallery } from './CatalogCardGallery'
import { MarketplaceCardImage } from './MarketplaceCardImage'
import { fetchActiveBusinessBenefits } from '../../modules/business-benefits/businessBenefitsRepository'

export function FeaturedHomeServicesSection({ excludeId }: { excludeId?: string }) {
  const [services, setServices] = useState<HomeServiceProvider[]>([])
  useEffect(() => {
    let active = true
    void Promise.resolve(fetchHomeServiceProviders({ pageSize: 12, coverOnly: true })).then(async ({ items }) => {
      const candidates = items.filter((item) => item.id !== excludeId)
      const benefitResults = await Promise.all(candidates.map((item) => fetchActiveBusinessBenefits('service_profile', item.id)))
      const featured = candidates.filter((_, index) => benefitResults[index]?.some((benefit) => benefit.benefitCode === 'profile_featured'))
      if (active) setServices(featured.slice(0, 3))
    }).catch(() => { if (active) setServices([]) })
    return () => { active = false }
  }, [excludeId])
  if (!services.length) return null
  return <section className="mt-8" aria-labelledby="featured-services-title">
    <div className="mb-4"><p className="text-xs font-black uppercase tracking-widest text-emerald-800">Recomendaciones</p><h2 id="featured-services-title" className="text-2xl font-bold">Servicios destacados</h2></div>
    <div className="catalog-card-grid">
      {services.map((service, index) => <CatalogCardFrame key={service.id} className="marketplace-listing-card">
        <a href={`/servicios/${encodeURIComponent(service.slug)}`} className="block">
          <CatalogCardGallery images={service.galleryUrls} label={service.displayName} eager={index === 0} fallback={<div className="marketplace-detail-image-fallback">Servicio para el hogar</div>} renderImage={(src, imageIndex, eager) => <MarketplaceCardImage src={src} alt={`${service.displayName}, imagen ${imageIndex + 1}`} eager={eager} className="property-photo-slide" fallback={<div className="marketplace-detail-image-fallback">Imagen no disponible</div>} />} />
          <div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">{HOME_SERVICE_CATEGORY_LABELS[service.category]}</p><h3 className="mt-1 text-lg font-bold">{service.displayName}</h3><p className="mt-2 line-clamp-2 text-sm text-neutral-600">{service.description}</p><p className="mt-3 text-xs text-neutral-500">{[...service.municipalities.slice(0, 2), service.province].filter(Boolean).join(' · ')}</p><span className="mt-4 inline-block font-semibold text-emerald-800">Ver perfil →</span></div>
        </a>
      </CatalogCardFrame>)}
    </div>
  </section>
}
