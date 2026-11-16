export const HOME_SERVICE_CATEGORIES = [
  'plomeria',
  'electricidad',
  'carpinteria',
  'albanileria',
  'pintura',
  'climatizacion',
  'limpieza',
  'jardineria',
  'mudanzas',
  'diseno',
  'otro',
] as const

export type HomeServiceCategory = (typeof HOME_SERVICE_CATEGORIES)[number]

export const HOME_SERVICE_CATEGORY_LABELS: Record<HomeServiceCategory, string> = {
  plomeria: 'Plomería',
  electricidad: 'Electricidad',
  carpinteria: 'Carpintería',
  albanileria: 'Albañilería',
  pintura: 'Pintura',
  climatizacion: 'Climatización',
  limpieza: 'Limpieza',
  jardineria: 'Jardinería',
  mudanzas: 'Mudanzas',
  diseno: 'Diseño y arquitectura',
  otro: 'Otro servicio',
}

export type HomeServiceProvider = {
  id: string
  slug: string
  displayName: string
  category: HomeServiceCategory
  description: string
  province: string
  municipalities: string[]
  phone: string | null
  whatsapp: string | null
  galleryUrls: string[]
  photoUnavailable?: boolean
  updatedAt: string
}
export type OwnedHomeServiceProvider = HomeServiceProvider & {
  galleryReferences: string[]
  status: 'pending_review' | 'published' | 'paused' | 'rejected'
}
