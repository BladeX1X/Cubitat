export const MATERIAL_CATEGORIES = [
  'cemento',
  'acero',
  'madera',
  'pintura',
  'electricidad',
  'plomeria',
  'pisos_revestimientos',
  'puertas_ventanas',
  'herramientas',
  'agregados',
  'otro',
] as const

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number]
export type MaterialCurrency = 'USD' | 'CUP' | 'EUR' | 'MIXED'

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  cemento: 'Cemento',
  acero: 'Acero y metales',
  madera: 'Madera',
  pintura: 'Pintura',
  electricidad: 'Electricidad',
  plomeria: 'Plomería',
  pisos_revestimientos: 'Pisos y revestimientos',
  puertas_ventanas: 'Puertas y ventanas',
  herramientas: 'Herramientas',
  agregados: 'Áridos y agregados',
  otro: 'Otro material',
}

export const MATERIAL_CURRENCIES: readonly MaterialCurrency[] = ['USD', 'CUP', 'EUR', 'MIXED']
export const MATERIAL_AVAILABILITIES = ['available', 'limited', 'out_of_stock', 'made_to_order'] as const

export type MaterialListing = {
  id: string
  slug: string
  title: string
  category: MaterialCategory
  description: string
  price: number | null
  currency: MaterialCurrency
  province: string
  availability: 'available' | 'limited' | 'out_of_stock' | 'made_to_order'
  phone: string | null
  whatsapp: string | null
  photoUrls: string[]
  /** True when at least one private photo reference could not be signed for reading. */
  photoUnavailable?: boolean
  updatedAt: string
}

export type OwnedMaterialListing = MaterialListing & {
  photoPaths: string[]
  status: 'pending_review' | 'published' | 'paused' | 'rejected' | 'archived'
}
