import { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from '../../shared/lib/supabaseClient'
import { getEditableProperty } from './editablePropertyRepository'

const AddressMap = lazy(() =>
  import('../../modules/maps/components/AddressMap').then((m) => ({ default: m.AddressMap }))
)
import {
  FileCheck,
  Upload,
  X,
  Sparkles,
  Minus,
  Plus,
  Check,
  Info,
  MapPin,
} from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { Textarea } from '../../shared/ui/textarea'
import {
  formatCubanPhoneForDisplay,
  normalizeCubanPhoneForStorage,
  validatePhone,
} from './phone'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/ui/select'

export type PublishFormData = {
  operation: 'venta' | 'alquiler' | 'permuta'
  propertyType: 'casa' | 'apartamento' | 'terreno'
  description: string
  priceUsd: string
  
  // Dirección Estructurada
  streetAddress: string
  noStreetNumber: boolean
  province: string
  municipality: string
  neighborhood: string
  location: string // Campo unificado final

  // Coordenadas geográficas (seleccionadas en el mapa)
  latitude: number | null
  longitude: number | null
  
  // Especificaciones - Características
  bedrooms: number
  bathrooms: number
  halfBathrooms: number
  parking: number
  levels: number
  
  landSize: string
  unknownLand: boolean
  
  constructionSize: string
  unknownConstruction: boolean
  
  gardenSize: string
  noGarden: boolean
  
  ageYears: number
  isNewBuild: boolean
  unknownAge: boolean

  // Especificaciones - Amenidades (Cuba-focused)
  hasCistern: boolean
  hasStreetGas: boolean
  has220v: boolean
  hasAc: boolean
  isFurnished: boolean
  hasLandline: boolean
  hasTerrace: boolean
  hasPortal: boolean

  // Contacto
  contactName: string
  contactPhone: string
}

const initialFormState: PublishFormData = {
  operation: 'venta',
  propertyType: 'casa',
  description: '',
  priceUsd: '',
  
  streetAddress: '',
  noStreetNumber: false,
  province: '',
  municipality: '',
  neighborhood: '',
  location: '',

  latitude: null,
  longitude: null,
  
  bedrooms: 1,
  bathrooms: 1,
  halfBathrooms: 0,
  parking: 0,
  levels: 1,
  
  landSize: '',
  unknownLand: false,
  
  constructionSize: '',
  unknownConstruction: false,
  
  gardenSize: '',
  noGarden: false,
  
  ageYears: 0,
  isNewBuild: false,
  unknownAge: false,
  
  hasCistern: false,
  hasStreetGas: false,
  has220v: false,
  hasAc: false,
  isFurnished: false,
  hasLandline: false,
  hasTerrace: false,
  hasPortal: false,
  
  contactName: '',
  contactPhone: '',
}

const operationLabels = {
  venta: 'Venta',
  alquiler: 'Renta / Alquiler',
  permuta: 'Permuta',
}

const propertyTypeLabels = {
  casa: 'Casa',
  apartamento: 'Departamento',
  terreno: 'Terreno',
}

const publishStepLabels = [
  'Dirección y ubicación',
  'Información general',
  'Características',
  'Amenidades',
  'Descripción',
  'Fotos',
  'Precio',
  'Contacto',
]

const cubanProvinces = [
  'La Habana',
  'Matanzas',
  'Santiago de Cuba',
  'Pinar del Río',
  'Artemisa',
  'Mayabeque',
  'Villa Clara',
  'Cienfuegos',
  'Sancti Spíritus',
  'Ciego de Ávila',
  'Camagüey',
  'Las Tunas',
  'Granma',
  'Holguín',
  'Guantánamo',
  'Isla de la Juventud',
]

const cubanMunicipalities: Record<string, string[]> = {
  'La Habana': [
    'Playa', 'Plaza de la Revolución', 'Centro Habana', 'La Habana Vieja',
    'Regla', 'La Habana del Este', 'Guanabacoa', 'San Miguel del Padrón',
    'Diez de Octubre', 'Cerro', 'Marianao', 'La Lisa', 'Boyeros', 'Arroyo Naranjo', 'Cotorro'
  ],
  'Matanzas': [
    'Matanzas', 'Cárdenas', 'Colón', 'Jovellanos', 'Jagüey Grande',
    'Calimete', 'Ciénaga de Zapata', 'Limonar', 'Los Arabos', 'Martí',
    'Pedro Betancourt', 'Perico', 'Unión de Reyes'
  ],
  'Santiago de Cuba': [
    'Santiago de Cuba', 'Contramaestre', 'Guamá', 'Mella', 'Palma Soriano',
    'San Luis', 'Segundo Frente', 'Songo - La Maya', 'Tercer Frente'
  ],
  'Pinar del Río': [
    'Pinar del Río', 'Consolación del Sur', 'Guane', 'La Palma', 'Los Palacios',
    'Mantua', 'Minas de Matahambre', 'San Juan y Martínez', 'San Luis', 'Sandino', 'Viñales'
  ],
  'Artemisa': [
    'Artemisa', 'Alquízar', 'Bahía Honda', 'Bauta', 'Caimito', 'Candelaria',
    'Guanajay', 'Güira de Melena', 'Mariel', 'San Antonio de los Baños', 'San Cristóbal'
  ],
  'Mayabeque': [
    'San José de las Lajas', 'Batabanó', 'Bejucal', 'Güines', 'Jaruco',
    'Madruga', 'Melena del Sur', 'Nueva Paz', 'Quivicán', 'San Nicolás', 'Santa Cruz del Norte'
  ],
  'Villa Clara': [
    'Santa Clara', 'Caibarién', 'Camajuaní', 'Cifuentes', 'Corralillo',
    'Encrucijada', 'Manicaragua', 'Placetas', 'Quemado de Güines', 'Ranchuelo',
    'Remedios', 'Sagua la Grande', 'Santo Domingo'
  ],
  'Cienfuegos': [
    'Cienfuegos', 'Abreus', 'Aguada de Pasajeros', 'Cruces', 'Cumanayagua', 'Lajas', 'Palmira', 'Rodas'
  ],
  'Sancti Spíritus': [
    'Sancti Spíritus', 'Cabaiguán', 'Fomento', 'Jatibonico', 'La Sierpe', 'Taguasco', 'Trinidad', 'Yaguajay'
  ],
  'Ciego de Ávila': [
    'Ciego de Ávila', 'Baraguá', 'Bolivia', 'Chambas', 'Ciro Redondo', 'Florencia', 'Majagua', 'Morón', 'Primero de Enero', 'Venezuela'
  ],
  'Camagüey': [
    'Camagüey', 'Carlos Manuel de Céspedes', 'Esmeralda', 'Florida', 'Guáimaro',
    'Jimaguayú', 'Minas', 'Najasa', 'Nuevitas', 'Santa Cruz del Sur', 'Sibanicú', 'Sierra de Cubitas', 'Vertientes'
  ],
  'Las Tunas': [
    'Las Tunas', 'Amancio', 'Colombia', 'Jesús Menéndez', 'Jobabo', 'Majibacoa', 'Manatí', 'Puerto Padre'
  ],
  'Granma': [
    'Bayamo', 'Bartolomé Masó', 'Buey Arriba', 'Campechuela', 'Cauto Cristo',
    'Guisa', 'Jiguaní', 'Manzanillo', 'Media Luna', 'Niquero', 'Pilón', 'Río Cauto', 'Yara'
  ],
  'Holguín': [
    'Holguín', 'Antilla', 'Báguano', 'Banes', 'Cacocum', 'Calixto García',
    'Cueto', 'Frank País', 'Gibara', 'Mayarí', 'Moa', 'Rafael Freyre', 'Sagua de Tánamo', 'Urbano Noris'
  ],
  'Guantánamo': [
    'Guantánamo', 'Baracoa', 'Caimanera', 'El Salvador', 'Imías', 'Maisí', 'Manuel Tames', 'Niceto Pérez', 'San Antonio del Sur', 'Yateras'
  ],
  'Isla de la Juventud': [
    'Isla de la Juventud'
  ]
}

type PublishPageProps = {
  onBack: () => void
  onSubmitSuccess: () => void
  editPropertyId?: string // When set, the form loads and updates an existing property
}

export function PublishPage({ onBack, onSubmitSuccess, editPropertyId }: PublishPageProps) {
  const isEditMode = Boolean(editPropertyId)
  const [step, setStep] = useState<number>(1)
  const [formData, setFormData] = useState<PublishFormData>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [images, setImages] = useState<{ dataUrl: string; size: number; name: string }[]>([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [editLoading, setEditLoading] = useState(isEditMode)
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null)

  const [showSaveFeedback, setShowSaveFeedback] = useState<boolean>(false)
  const progressPercent = Math.round((step / publishStepLabels.length) * 100)
  const currentStepLabel = publishStepLabels[step - 1] ?? 'Publicación'

  // 1. Detectar e instalar borrador automáticamente si viene de la URL
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('load_draft=true')) {
      try {
        const savedDraft = localStorage.getItem('cubitat_publish_draft')
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft)
          if (parsed && typeof parsed === 'object') {
            setFormData((prev) => ({ ...prev, ...parsed }))
          }
        }
      } catch (err) {
        console.error('Error al cargar borrador automático:', err)
      }
    }
  }, [])

  useEffect(() => {
    if (isEditMode) return

    let cancelled = false

    async function loadSellerContact() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || ''
      let profileName = ''
      let profilePhone = ''

      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        profileName = typeof data.full_name === 'string' ? data.full_name : ''
        profilePhone = typeof data.phone === 'string' ? data.phone : ''
      }

      if (cancelled) return

      setFormData((prev) => ({
        ...prev,
        contactName: prev.contactName || profileName || fallbackName,
        contactPhone: prev.contactPhone || formatCubanPhoneForDisplay(profilePhone),
      }))
    }

    loadSellerContact()

    return () => {
      cancelled = true
    }
  }, [isEditMode])

  // Load existing property data when editing
  useEffect(() => {
    if (!editPropertyId) return
    const propertyId = editPropertyId
    let cancelled = false
    async function loadProperty() {
      setEditLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) {
          onBack()
          return
        }

        const { data, error } = await getEditableProperty(propertyId, user.id)
        if (cancelled) return
        if (error) throw error
        if (!data) {
          onBack()
          return
        }
        if (data) {
          const features = data.features || {}
          const contactInfo = data.contact_info || {}
          const coords = data.coordinates || {}
          const locationParts = (data.location || '').split(', ').map((s: string) => s.trim())
          
          let streetAddress = ''
          let neighborhood = ''
          let municipality = ''
          let province = ''
          
          if (locationParts.length >= 4) {
            streetAddress = locationParts[0]
            neighborhood = locationParts[1]
            municipality = locationParts[2]
            province = locationParts[3]
          } else if (locationParts.length === 3) {
            streetAddress = locationParts[0]
            municipality = locationParts[1]
            province = locationParts[2]
          } else if (locationParts.length === 2) {
            municipality = locationParts[0]
            province = locationParts[1]
          } else if (locationParts.length === 1) {
            streetAddress = locationParts[0]
          }

          setFormData({
            operation: data.operation || 'venta',
            propertyType: data.property_type || 'casa',
            description: data.description || '',
            priceUsd: data.price_usd ? String(data.price_usd) : '',
            streetAddress,
            noStreetNumber: streetAddress === 'Calle s/n',
            province,
            municipality,
            neighborhood,
            location: data.location || '',
            latitude: coords.latitude || null,
            longitude: coords.longitude || null,
            bedrooms: data.bedrooms || 1,
            bathrooms: data.bathrooms || 1,
            halfBathrooms: features.halfBathrooms || 0,
            parking: data.parking || 0,
            levels: features.levels || 1,
            landSize: features.landSize || '',
            unknownLand: features.unknownLand || false,
            constructionSize: features.constructionSize || String(data.area_m2 || ''),
            unknownConstruction: features.unknownConstruction || false,
            gardenSize: features.gardenSize || '',
            noGarden: features.noGarden || false,
            ageYears: data.age_years || 0,
            isNewBuild: features.isNewBuild || false,
            unknownAge: features.unknownAge || false,
            hasCistern: features.hasCistern || false,
            hasStreetGas: features.hasStreetGas || false,
            has220v: features.has220v || false,
            hasAc: features.hasAc || false,
            isFurnished: features.isFurnished || false,
            hasLandline: features.hasLandline || false,
            hasTerrace: features.hasTerrace || false,
            hasPortal: features.hasPortal || false,
            contactName: contactInfo.name || '',
            contactPhone: formatCubanPhoneForDisplay(contactInfo.phone || ''),
          })
          // Load existing images as preview-only entries
          if (data.images && data.images.length > 0) {
            setImages(data.images.map((url: string, i: number) => ({
              dataUrl: url,
              size: 0,
              name: `existing-${i}.webp`,
            })))
          }
        }
      } catch (err) {
        console.error('Error loading property for edit:', err)
        alert('No se pudo cargar la propiedad para editar.')
        onBack()
      } finally {
        if (!cancelled) setEditLoading(false)
      }
    }
    loadProperty()

    return () => {
      cancelled = true
    }
  }, [editPropertyId, onBack])

  // Guardar borrador manualmente al pulsar el botón
  function handleSaveDraftManual() {
    try {
      localStorage.setItem('cubitat_publish_draft', JSON.stringify(formData))
      setShowSaveFeedback(true)
      setTimeout(() => setShowSaveFeedback(false), 2500)
    } catch (err) {
      console.warn('No se pudo guardar el borrador en localStorage:', err)
      alert('Hubo un problema al guardar el borrador en tu dispositivo.')
    }
  }

  // 2. Sincronizar datos de los campos de texto
  function updateFormData(updates: Partial<PublishFormData>) {
    setFormData((prev) => {
      const next = { ...prev, ...updates }
      
      const addressParts = [
        next.streetAddress,
        next.neighborhood,
        next.municipality,
        next.province
      ].filter(Boolean)
      next.location = addressParts.join(', ')

      return next
    })
  }

  function handleClearDraft() {
    if (window.confirm('¿Estás seguro de que quieres borrar el borrador y empezar de cero?')) {
      setFormData(initialFormState)
      setImages([])
      setStep(1)
      try {
        localStorage.removeItem('cubitat_publish_draft')
      } catch (err) {
        console.warn('No se pudo remover el borrador de localStorage:', err)
      }
    }
  }

  // 3. Compresor de fotos a WebP (con canvas)
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    
    if (images.length + files.length > 20) {
      alert('Solo puedes subir un máximo de 20 imágenes.')
      return
    }

    setIsCompressing(true)
    const newCompressed: typeof images = []

    let uploadFailures = 0
    for (const file of files) {
      try {
        const result = await compressToWebP(file)
        newCompressed.push({
          dataUrl: result.dataUrl,
          size: result.size,
          name: file.name.replace(/\.[^/.]+$/, "") + ".webp"
        })
      } catch (err) {
        console.error('Error comprimiendo la foto:', err)
        uploadFailures++
      }
    }

    if (uploadFailures > 0) {
      alert(`No se pudieron procesar ${uploadFailures} imágenes debido a un formato no admitido o un archivo corrupto.`)
    }

    setImages((prev) => [...prev, ...newCompressed])
    setIsCompressing(false)
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Debes iniciar sesión para publicar.')
      return
    }

    if (images.length === 0 && !isEditMode) {
      alert('Por favor, agrega al menos una foto de la propiedad.')
      return
    }

    try {
      setIsSubmitting(true)

      // 1. Subir imágenes a Storage
      const uploadedImages: string[] = []
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        if (img.dataUrl.startsWith('http')) {
          uploadedImages.push(img.dataUrl)
          continue
        }

        const fileName = `${user.id}/${Date.now()}-${i}.webp`
        
        // Convert dataUrl back to blob for upload
        const blob = await (await fetch(img.dataUrl)).blob()
        
        const { error } = await supabase.storage
          .from('property_images')
          .upload(fileName, blob, { contentType: 'image/webp' })
          
        if (error) {
          console.error("Error al subir imagen:", error)
          continue
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('property_images')
          .getPublicUrl(fileName)
          
        if (publicUrlData) {
          uploadedImages.push(publicUrlData.publicUrl)
        }
      }
      
      // 2. Preparar campos extra
      const features = {
        halfBathrooms: formData.halfBathrooms,
        levels: formData.levels,
        landSize: formData.landSize,
        unknownLand: formData.unknownLand,
        constructionSize: formData.constructionSize,
        unknownConstruction: formData.unknownConstruction,
        gardenSize: formData.gardenSize,
        noGarden: formData.noGarden,
        isNewBuild: formData.isNewBuild,
        unknownAge: formData.unknownAge,
        hasCistern: formData.hasCistern,
        hasStreetGas: formData.hasStreetGas,
        has220v: formData.has220v,
        hasAc: formData.hasAc,
        isFurnished: formData.isFurnished,
        hasLandline: formData.hasLandline,
        hasTerrace: formData.hasTerrace,
        hasPortal: formData.hasPortal,
      }
      
      const contactInfo = {
        name: formData.contactName,
        phone: normalizeCubanPhoneForStorage(formData.contactPhone)
      }
      
      const amenities: string[] = []
      if (formData.hasCistern) amenities.push('Cisterna')
      if (formData.hasStreetGas) amenities.push('Gas de la calle')
      if (formData.has220v) amenities.push('Corriente 220V')
      if (formData.hasAc) amenities.push('Climatizada')
      if (formData.isFurnished) amenities.push('Amueblada')
      if (formData.hasLandline) amenities.push('Teléfono fijo')
      if (formData.hasTerrace) amenities.push('Terraza')
      if (formData.hasPortal) amenities.push('Portal')

      const propertyTypeName = formData.propertyType === 'apartamento' ? 'Departamento' : formData.propertyType === 'casa' ? 'Casa' : 'Terreno'
      const operationName = formData.operation === 'alquiler' ? 'en renta' : formData.operation === 'venta' ? 'en venta' : 'en permuta'
      const generatedTitle = `${propertyTypeName} ${operationName} en ${formData.municipality || formData.neighborhood || 'Cuba'}`

      // 3. Insertar o actualizar en base de datos (con status pending_review por defecto)
      const propertyPayload = {
        user_id: user.id,
        title: generatedTitle,
        location: formData.location || 'Cuba',
        description: formData.description || 'Sin descripción',
        zone_id: 'all',
        operation: formData.operation,
        property_type: formData.propertyType,
        price_usd: formData.priceUsd ? Number(formData.priceUsd) : null,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        parking: formData.parking,
        area_m2: Number(formData.constructionSize) || Number(formData.landSize) || 0,
        age_years: formData.ageYears,
        amenities,
        status: 'pending_review',
        moderation_message: null,
        cover_image: uploadedImages.length > 0 ? uploadedImages[0] : null,
        images: uploadedImages,
        features,
        contact_info: contactInfo,
        coordinates: (formData.latitude && formData.longitude) ? { latitude: formData.latitude, longitude: formData.longitude } : null,
      }

      let savedPropertyId = editPropertyId;
      
      setAiStatusMessage('Guardando publicación...')

      if (isEditMode && editPropertyId) {
        const { error } = await supabase
          .from('properties')
          .update(propertyPayload)
          .eq('id', editPropertyId)
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('properties')
          .insert(propertyPayload)
          .select('id')
          .single()
        if (error) throw error;
        if (data) savedPropertyId = data.id;
      }

      // 4. Iniciar moderación por IA en segundo plano (Fire and forget)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || ''
        
        // No le hacemos await para no colgar la UI
        fetch('/api/ai-moderate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            property_id: savedPropertyId,
            title: generatedTitle,
            location: formData.location || '',
            description: formData.description || '',
            price_usd: formData.priceUsd,
            property_type: formData.propertyType,
            images: images.map(img => img.dataUrl)
          })
        }).catch(e => console.warn('Error asincrono IA', e));
      } catch (e) {
        console.warn('Error preparando moderacion asincrona', e);
      }
      
      setSubmitted(true)
      localStorage.removeItem('cubitat_publish_draft')
      setTimeout(() => {
        onSubmitSuccess()
      }, 3000)
    } catch (error: any) {
      console.error('Error publicando propiedad:', error)
      alert(`Hubo un error al publicar la propiedad: ${error.message || JSON.stringify(error)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  function nextStep() {
    setStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Permite saltar pasos directamente en el timeline si el paso previo es válido
  function navigateToStep(targetStep: number) {
    setStep(targetStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function prevStep() {
    setStep((s) => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="publish-wizard-view bg-neutral-100/40 min-h-screen">
      
      {/* 1. Green Hero Header */}
      <section className="publish-hero">
        <div className="publish-hero-inner max-w-7xl mx-auto px-4 flex justify-between items-start">
          <div>
            <h1>{isEditMode ? 'Editar propiedad' : 'Publicar propiedad'}</h1>
            <p>{isEditMode ? 'Modifica los datos de tu propiedad y guarda los cambios.' : 'Asegúrate de documentar todos los datos de tu propiedad y verifica que sean correctos.'}</p>
            <div className="publish-hero-pills" aria-label="Ventajas de publicar en Cubitat">
              <span>Revisión segura</span>
              <span>Mapa automático</span>
              <span>Borrador editable</span>
            </div>
          </div>
          <div className="publish-hero-actions flex items-center gap-2">
            {showSaveFeedback && (
              <span className="text-[10px] text-emerald-100 bg-[#024a41] px-3 py-1 rounded-full font-bold animate-pulse">
                ¡Borrador guardado!
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={isEditMode ? () => handleSubmit() : handleSaveDraftManual}
              className="border-white text-white bg-transparent hover:bg-white/10 rounded-full h-9 px-4 text-xs font-bold transition-all duration-200"
            >
              {isEditMode ? (isSubmitting ? 'Guardando...' : 'Guardar Cambios') : 'Guardar Borrador'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="border-white text-white bg-transparent hover:bg-white/10 rounded-full h-9 px-4 text-xs font-bold transition-all duration-200"
            >
              Salir
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Main Overlapping Grid Wrapper */}
      <div className="publish-container max-w-7xl mx-auto px-4">
        <div className="publish-main-card">
          {editLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <span className="inline-block w-8 h-8 border-4 border-[#035f53] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-neutral-500">Cargando datos de la propiedad...</p>
            </div>
          ) : submitted ? (
            <PublishSuccessCard />
          ) : (
            <>
            <div className="publish-progress-summary" aria-label="Progreso de publicación">
              <div>
                <span>Paso {step} de {publishStepLabels.length}</span>
                <strong>{currentStepLabel}</strong>
              </div>
              <div className="publish-progress-track" aria-hidden="true">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            <div className="publish-grid-layout">
              
              {/* Left Column: Sidebar 8-Steps Timeline Navigator */}
              <PublishSidebarSteps
                currentStep={step}
                onNavigate={navigateToStep}
                formData={formData}
                images={images}
              />

              {/* Right Column: Form Container */}
              <div className="publish-form-card">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {step === 1 && (
                    <StepAddress
                      formData={formData}
                      onChange={updateFormData}
                      onNext={nextStep}
                    />
                  )}

                  {step === 2 && (
                    <StepGeneralInfo
                      formData={formData}
                      onChange={updateFormData}
                      onNext={nextStep}
                      onBack={prevStep}
                    />
                  )}

                  {step === 3 && (
                    <StepSpecs
                      formData={formData}
                      onChange={updateFormData}
                      onNext={nextStep}
                      onBack={prevStep}
                    />
                  )}

                  {step === 4 && (
                    <StepAmenities
                      formData={formData}
                      onChange={updateFormData}
                      onNext={nextStep}
                      onBack={prevStep}
                    />
                  )}

                  {step === 5 && (
                    <StepDescription
                      formData={formData}
                      onChange={updateFormData}
                      onNext={nextStep}
                      onBack={prevStep}
                    />
                  )}

                  {step === 6 && (
                    <StepImages
                      images={images}
                      isCompressing={isCompressing}
                      onImageUpload={handleImageUpload}
                      onRemoveImage={removeImage}
                      onNext={nextStep}
                      onBack={prevStep}
                    />
                  )}

                  {step === 7 && (
                    <StepPrice
                      formData={formData}
                      onChange={updateFormData}
                      onNext={nextStep}
                      onBack={prevStep}
                    />
                  )}

                  {step === 8 && (
                    <StepContact
                      formData={formData}
                      onChange={updateFormData}
                      onBack={prevStep}
                      onClearDraft={handleClearDraft}
                      isSubmitting={isSubmitting}
                      isEditMode={isEditMode}
                      aiStatusMessage={aiStatusMessage}
                    />
                  )}

                </form>
              </div>

            </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   SUBCOMPONENTES: SIDEBAR DE 8 PASOS
   ========================================================================== */
function PublishSidebarSteps({
  currentStep,
  onNavigate,
  formData,
  images,
}: {
  currentStep: number
  onNavigate: (step: number) => void
  formData: PublishFormData
  images: any[]
}) {
  const stepsDef = [
    {
      num: 1,
      label: 'Propiedad',
      substeps: [
        { stepVal: 1, label: 'Dirección y Ubicación', validate: () => !!formData.streetAddress && !!formData.province && !!formData.municipality },
        { stepVal: 2, label: 'Información general', validate: () => !!formData.operation && !!formData.propertyType },
      ],
    },
    {
      num: 2,
      label: 'Especificaciones',
      substeps: [
        { stepVal: 3, label: 'Características', validate: () => (!!formData.constructionSize || formData.unknownConstruction || !!formData.landSize || formData.unknownLand) },
        { stepVal: 4, label: 'Amenidades y Servicios', validate: () => true }, // No bloqueante
        { stepVal: 5, label: 'Descripción', validate: () => formData.description.length >= 15 },
        { stepVal: 6, label: 'Imágenes', validate: () => images.length >= 1 },
      ],
    },
    {
      num: 3,
      label: 'Precio',
      substeps: [
        { stepVal: 7, label: 'Valor venta/renta', validate: () => {
          const val = parseFloat(formData.priceUsd)
          if (isNaN(val)) return false
          const min = formData.operation === 'alquiler' ? 100 : 1000
          return val >= min && val <= 5000000
        }},
      ],
    },
    {
      num: 4,
      label: 'Contacto',
      substeps: [
        { stepVal: 8, label: 'Contacto y Publicar', validate: () => !!formData.contactName && validatePhone(formData.contactPhone) },
      ],
    },
  ]

  // Determinar si un subpaso es accesible
  function isSubStepAccessible(targetVal: number): boolean {
    if (targetVal === 1) return true
    
    // Obtener lista plana de subpasos previos
    const flatSubsteps: { stepVal: number; validate: () => boolean }[] = []
    stepsDef.forEach(g => {
      g.substeps.forEach(s => flatSubsteps.push(s))
    })

    const currentIndex = flatSubsteps.findIndex(s => s.stepVal === targetVal)
    if (currentIndex === -1) return false

    // Verificar que todos los anteriores sean válidos
    for (let i = 0; i < currentIndex; i++) {
      if (!flatSubsteps[i].validate()) {
        return false
      }
    }
    return true
  }

  return (
    <div className="publish-sidebar-steps">
      {stepsDef.map((group) => {
        const isGroupActive = group.substeps.some((s) => s.stepVal === currentStep)
        const isGroupCompleted = group.substeps.every((s) => s.stepVal < currentStep)

        return (
          <div key={group.num} className="publish-step-group">
            <div className="publish-step-header">
              <span
                className={`publish-step-bubble ${
                  isGroupCompleted ? 'completed' : isGroupActive ? 'active' : ''
                }`}
              >
                {group.num}
              </span>
              <span>{group.label}</span>
            </div>

            <div className="publish-substeps-list">
              {group.substeps.map((sub) => {
                const isSubActive = currentStep === sub.stepVal
                const isClickable = isSubStepAccessible(sub.stepVal)

                return (
                  <button
                    key={sub.stepVal}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => onNavigate(sub.stepVal)}
                    className={`publish-substep-item ${isSubActive ? 'active' : ''} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span className="publish-substep-dot" />
                    <span>{sub.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   SUBCOMPONENTES: CONTADOR REUTILIZABLE
   ========================================================================== */
function FormCounter({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (val: number) => void
}) {
  return (
    <div className="bg-white border border-neutral-100 rounded-xl p-4 flex flex-col items-center justify-between text-center gap-3 shadow-sm hover:border-[#035f53] transition-all duration-200">
      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-neutral-200 bg-neutral-50 flex items-center justify-center text-neutral-500 hover:border-emerald-700 hover:text-emerald-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
        >
          <Minus size={14} strokeWidth={2.5} />
        </button>
        <span className="text-base font-extrabold text-neutral-800 w-5">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-neutral-200 bg-neutral-50 flex items-center justify-center text-neutral-500 hover:border-emerald-700 hover:text-emerald-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
   SUBCOMPONENTES: PASOS DEL FORMULARIO
   ========================================================================== */

/* Paso 1: Dirección y Ubicación (Estructurado) */
function StepAddress({
  formData,
  onChange,
  onNext,
}: {
  formData: PublishFormData
  onChange: (updates: Partial<PublishFormData>) => void
  onNext: () => void
}) {
  const isNextDisabled = !formData.streetAddress || !formData.province || !formData.municipality
  const shouldShowMap = Boolean(formData.province && formData.municipality)

  return (
    <div className="space-y-5">

      <div className="publish-form-card-header">
        <span className="publish-step-bubble active text-[10px]">1</span>
        <span>Propiedad - Dirección y Ubicación</span>
      </div>

      {/* Two-column layout: form fields | map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Address form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Calle y Número *</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="chk-no-number"
                  checked={formData.noStreetNumber}
                  onChange={(e) => onChange({ noStreetNumber: e.target.checked, streetAddress: e.target.checked ? 'Calle s/n' : formData.streetAddress })}
                  className="rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
                />
                <label htmlFor="chk-no-number" className="text-xs text-neutral-500 font-medium cursor-pointer">Sin número (s/n)</label>
              </div>
            </div>
            <Input
              required
              disabled={formData.noStreetNumber}
              placeholder={formData.noStreetNumber ? "Sin número" : "Ej: Calle 23 #456 e/ H e I"}
              value={formData.streetAddress}
              onChange={(e) => onChange({ streetAddress: e.target.value })}
              className="h-11 border-neutral-200 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-semibold">Provincia *</label>
            <Select
              value={formData.province}
              onValueChange={(val) => onChange({ province: val, municipality: '', latitude: null, longitude: null })}
            >
              <SelectTrigger className="h-11 border-neutral-200 text-xs transition-colors duration-200">
                <SelectValue placeholder="Selecciona">{formData.province}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cubanProvinces.map((prov) => (
                  <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-semibold">Municipio *</label>
            <Select
              value={formData.municipality}
              onValueChange={(val) => onChange({ municipality: val, latitude: null, longitude: null })}
            >
              <SelectTrigger
                disabled={!formData.province}
                className="h-11 border-neutral-200 text-xs transition-colors duration-200 disabled:opacity-50 disabled:bg-neutral-50"
              >
                <SelectValue placeholder={formData.province ? "Selecciona" : "Elige provincia primero"}>
                  {formData.municipality}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(cubanMunicipalities[formData.province] || []).map((mun) => (
                  <SelectItem key={mun} value={mun}>{mun}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Reparto / Barrio</label>
            <Input
              placeholder="Ej: Miramar o Vedado"
              value={formData.neighborhood}
              onChange={(e) => onChange({ neighborhood: e.target.value })}
              className="h-11 border-neutral-200 text-xs"
            />
          </div>

          {/* Coordinates readout */}
          {(formData.latitude !== null && formData.longitude !== null) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-base">📍</span>
              <div>
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Ubicación marcada</p>
                <p className="text-[11px] text-emerald-700 font-mono">
                  {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ latitude: null, longitude: null })}
                className="ml-auto text-[10px] text-emerald-600 hover:text-emerald-800 font-bold underline"
              >
                Quitar
              </button>
            </div>
          )}
        </div>

        {/* Right: Interactive Map */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Ubicación en el Mapa
          </label>
          <div className="flex-1 min-h-[300px] lg:min-h-[340px]">
            {shouldShowMap ? (
              <Suspense fallback={
                <div className="w-full h-full min-h-[300px] rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-[#035f53] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[11px] text-neutral-400">Cargando mapa…</p>
                  </div>
                </div>
              }>
                <AddressMap
                  province={formData.province}
                  municipality={formData.municipality}
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onCoordinatesChange={(lat, lng) => onChange({ latitude: lat, longitude: lng })}
                />
              </Suspense>
            ) : (
              <div className="w-full h-full min-h-[300px] rounded-xl bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center p-6">
                <div className="max-w-xs text-center space-y-3">
                  <MapPin className="w-8 h-8 text-[#035f53] mx-auto" />
                  <p className="text-sm font-bold text-neutral-800">Selecciona provincia y municipio</p>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    El mapa se abrirá automáticamente con la vista del municipio para que puedas marcar la ubicación exacta.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          disabled={isNextDisabled}
          onClick={onNext}
          className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 px-8 text-xs font-bold transition-colors duration-200"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}

/* Paso 2: Información General (Tipo de operación y Tipo de propiedad en botones premium) */
function StepGeneralInfo({
  formData,
  onChange,
  onNext,
  onBack,
}: {
  formData: PublishFormData
  onChange: (updates: Partial<PublishFormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const operations: PublishFormData['operation'][] = ['venta', 'alquiler', 'permuta']
  const propertyTypes: PublishFormData['propertyType'][] = ['casa', 'apartamento', 'terreno']

  return (
    <div className="space-y-6">
      <div className="publish-form-card-header">
        <span className="publish-step-bubble active text-[10px]">1</span>
        <span>Propiedad - Información General</span>
      </div>

      {/* Operación */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-semibold block">¿Qué tipo de anuncio deseas publicar?</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {operations.map((op) => {
            const isActive = formData.operation === op
            return (
              <button
                key={op}
                type="button"
                onClick={() => onChange({ operation: op })}
                className={`py-3 px-2 rounded-xl border text-xs font-bold text-center transition-all duration-200 capitalize ${
                  isActive
                    ? 'border-[#035f53] bg-emerald-50/40 text-[#035f53] shadow-sm'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}
              >
                {operationLabels[op]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tipo de Inmueble */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 font-semibold block">¿Qué tipo de inmueble es?</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {propertyTypes.map((type) => {
            const isActive = formData.propertyType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ propertyType: type })}
                className={`py-3 px-3 rounded-xl border text-sm font-bold text-center transition-all duration-200 capitalize ${
                  isActive
                    ? 'border-[#035f53] bg-emerald-50/40 text-[#035f53] shadow-sm'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}
              >
                {propertyTypeLabels[type]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-neutral-100">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full h-11 px-6 text-xs font-bold border-neutral-200 hover:bg-neutral-50 transition-colors duration-200"
        >
          Atrás
        </Button>
        <Button
          type="button"
          onClick={onNext}
          className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 px-8 text-xs font-bold transition-colors duration-200"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}

/* Paso 3: Características */
function StepSpecs({
  formData,
  onChange,
  onNext,
  onBack,
}: {
  formData: PublishFormData
  onChange: (updates: Partial<PublishFormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const isNextDisabled =
    (!formData.constructionSize && !formData.unknownConstruction) &&
    (!formData.landSize && !formData.unknownLand)

  return (
    <div className="space-y-6">
      <div className="publish-form-card-header">
        <span className="publish-step-bubble active text-[10px]">2</span>
        <span>Especificaciones - Características</span>
      </div>

      {formData.propertyType !== 'terreno' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1 animate-scaleUp">
          <FormCounter label="Recámaras" value={formData.bedrooms} min={1} onChange={(val) => onChange({ bedrooms: val })} />
          <FormCounter label="Baños" value={formData.bathrooms} min={1} onChange={(val) => onChange({ bathrooms: val })} />
          <FormCounter label="Medios Baños" value={formData.halfBathrooms} min={0} onChange={(val) => onChange({ halfBathrooms: val })} />
          <FormCounter label="Número de Niveles" value={formData.levels} min={1} onChange={(val) => onChange({ levels: val })} />
          <FormCounter label="Estacionamiento" value={formData.parking} min={0} onChange={(val) => onChange({ parking: val })} />
        </div>
      )}

      {/* Tamaños */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Construcción */}
        {formData.propertyType !== 'terreno' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Construcción *</label>
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  id="chk-unk-const"
                  checked={formData.unknownConstruction}
                  onChange={(e) => onChange({ unknownConstruction: e.target.checked, constructionSize: e.target.checked ? '' : formData.constructionSize })}
                  className="rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
                />
                <label htmlFor="chk-unk-const" className="text-[10px] text-neutral-500 font-bold cursor-pointer">No sé</label>
              </div>
            </div>
            <div className="relative">
              <Input
                type="number"
                disabled={formData.unknownConstruction}
                placeholder={formData.unknownConstruction ? "No sé" : "Ej: 90"}
                value={formData.constructionSize}
                onChange={(e) => onChange({ constructionSize: e.target.value })}
                className="h-11 border-neutral-200 text-xs pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">m²</span>
            </div>
          </div>
        )}

        {/* Terreno */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Terreno *</label>
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                id="chk-unk-land"
                checked={formData.unknownLand}
                onChange={(e) => onChange({ unknownLand: e.target.checked, landSize: e.target.checked ? '' : formData.landSize })}
                className="rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
              />
              <label htmlFor="chk-unk-land" className="text-[10px] text-neutral-500 font-bold cursor-pointer">No sé</label>
            </div>
          </div>
          <div className="relative">
            <Input
              type="number"
              disabled={formData.unknownLand}
              placeholder={formData.unknownLand ? "No sé" : "Ej: 150"}
              value={formData.landSize}
              onChange={(e) => onChange({ landSize: e.target.value })}
              className="h-11 border-neutral-200 text-xs pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">m²</span>
          </div>
        </div>

      </div>

      {/* Jardín y Antigüedad */}
      {formData.propertyType !== 'terreno' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Jardín</label>
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  id="chk-no-garden"
                  checked={formData.noGarden}
                  onChange={(e) => onChange({ noGarden: e.target.checked, gardenSize: e.target.checked ? '' : formData.gardenSize })}
                  className="rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
                />
                <label htmlFor="chk-no-garden" className="text-[10px] text-neutral-500 font-bold cursor-pointer">Sin jardín</label>
              </div>
            </div>
            <div className="relative">
              <Input
                type="number"
                disabled={formData.noGarden}
                placeholder={formData.noGarden ? "Sin jardín" : "Ej: 20"}
                value={formData.gardenSize}
                onChange={(e) => onChange({ gardenSize: e.target.value })}
                className="h-11 border-neutral-200 text-xs pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">m²</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Antigüedad (Años)</label>
            <div className="flex gap-4 items-center h-11 border border-neutral-200 rounded-md px-3 bg-white">
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  id="chk-new"
                  checked={formData.isNewBuild}
                  onChange={(e) => onChange({ isNewBuild: e.target.checked, ageYears: e.target.checked ? 0 : formData.ageYears, unknownAge: e.target.checked ? false : formData.unknownAge })}
                  className="rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
                />
                <label htmlFor="chk-new" className="text-xs text-neutral-500 font-medium cursor-pointer">Nuevo</label>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  id="chk-unk-age"
                  checked={formData.unknownAge}
                  onChange={(e) => onChange({ unknownAge: e.target.checked, ageYears: e.target.checked ? 0 : formData.ageYears, isNewBuild: e.target.checked ? false : formData.isNewBuild })}
                  className="rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
                />
                <label htmlFor="chk-unk-age" className="text-xs text-neutral-500 font-medium cursor-pointer">No sé</label>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Mostrar contador de años si no es nuevo ni desconocido */}
      {formData.propertyType !== 'terreno' && !formData.isNewBuild && !formData.unknownAge && (
        <FormCounter
          label="Años desde la construcción"
          value={formData.ageYears}
          min={0}
          onChange={(val) => onChange({ ageYears: val })}
        />
      )}

      <div className="flex justify-between pt-4 border-t border-neutral-100">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full h-11 px-6 text-xs font-bold border-neutral-200 hover:bg-neutral-50 transition-colors duration-200"
        >
          Atrás
        </Button>
        <Button
          type="button"
          disabled={isNextDisabled}
          onClick={onNext}
          className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 px-8 text-xs font-bold transition-colors duration-200"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}

/* Paso 4: Amenidades y Servicios (Cuba-Focused Checkboxes) */
function StepAmenities({
  formData,
  onChange,
  onNext,
  onBack,
}: {
  formData: PublishFormData
  onChange: (updates: Partial<PublishFormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const amenitiesDef = [
    { key: 'hasCistern', label: 'Cisterna / Tanque elevado', desc: 'Suministro de agua propio' },
    { key: 'hasStreetGas', label: 'Gas de la calle', desc: 'Gas licuado directo por tubería' },
    { key: 'has220v', label: 'Corriente 220v', desc: 'Ideal para aires acondicionados' },
    { key: 'hasAc', label: 'Aire acondicionado', desc: 'Split o consolas instaladas' },
    { key: 'isFurnished', label: 'Totalmente amueblado', desc: 'Mobiliario y electrodomésticos incluidos' },
    { key: 'hasLandline', label: 'Teléfono fijo', desc: 'Línea de telefonía fija de Etecsa' },
    { key: 'hasTerrace', label: 'Terraza / Azotea libre', desc: 'Espacio al aire libre propio o libre' },
    { key: 'hasPortal', label: 'Portal / Jardín', desc: 'Entrada techada exterior o espacio verde' },
  ]

  return (
    <div className="space-y-5">
      <div className="publish-form-card-header">
        <span className="publish-step-bubble active text-[10px]">2</span>
        <span>Especificaciones - Amenidades y Servicios</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {amenitiesDef.map((am) => {
          const isChecked = !!(formData as any)[am.key]
          return (
            <div
              key={am.key}
              onClick={() => onChange({ [am.key]: !isChecked })}
              className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer select-none transition-all duration-200 ${
                isChecked
                  ? 'border-[#035f53] bg-emerald-50/20'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                isChecked ? 'bg-[#035f53] border-[#035f53] text-white' : 'border-neutral-300 bg-white'
              }`}>
                {isChecked && <Check size={10} strokeWidth={4} />}
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-neutral-800 block">{am.label}</span>
                <span className="text-[10px] text-neutral-400 block">{am.desc}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between pt-4 border-t border-neutral-100">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full h-11 px-6 text-xs font-bold border-neutral-200 hover:bg-neutral-50 transition-colors duration-200"
        >
          Atrás
        </Button>
        <Button
          type="button"
          onClick={onNext}
          className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 px-8 text-xs font-bold transition-colors duration-200"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}

/* Paso 5: Descripción (Con AI Generator local) */
function StepDescription({
  formData,
  onChange,
  onNext,
  onBack,
}: {
  formData: PublishFormData
  onChange: (updates: Partial<PublishFormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const isNextDisabled = formData.description.length < 15

  return (
    <div className="space-y-5">
      <div className="publish-form-card-header">
        <span className="publish-step-bubble active text-[10px]">2</span>
        <span>Especificaciones - Descripción</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Escribe una descripción *</label>
        </div>
        <Textarea
          required
          rows={7}
          placeholder="Describe la construcción, facilidades de pago, accesibilidad, etc. (Mínimo 15 caracteres)"
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="border-neutral-200 text-xs"
        />
        {formData.description.length < 15 && formData.description.length > 0 && (
          <span className="text-[10px] text-red-500 font-bold block animate-pulse">La descripción debe tener al menos 15 caracteres. Falta {15 - formData.description.length}.</span>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-neutral-100">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full h-11 px-6 text-xs font-bold border-neutral-200 hover:bg-neutral-50 transition-colors duration-200"
        >
          Atrás
        </Button>
        <Button
          type="button"
          disabled={isNextDisabled}
          onClick={onNext}
          className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 px-8 text-xs font-bold transition-colors duration-200"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}

/* Paso 6: Imágenes (Uploader WebP obligatorio) */
function StepImages({
  images,
  isCompressing,
  onImageUpload,
  onRemoveImage,
  onNext,
  onBack,
}: {
  images: { dataUrl: string; size: number; name: string }[]
  isCompressing: boolean
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: (idx: number) => void
  onNext: () => void
  onBack: () => void
}) {
  const isNextDisabled = images.length === 0

  return (
    <div className="space-y-5">
      <div className="publish-form-card-header">
        <span className="publish-step-bubble active text-[10px]">2</span>
        <span>Especificaciones - Imágenes</span>
      </div>

      <div className="space-y-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Sube fotos del inmueble (Mínimo 1, Máximo 20)</label>
        
        <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 hover:border-[#035f53] rounded-xl p-8 bg-neutral-50/50 cursor-pointer transition-colors duration-200 group">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={onImageUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload size={28} className="text-neutral-400 group-hover:text-[#035f53] transition-colors duration-200 mb-2" />
          <span className="text-xs font-bold text-neutral-700">Arrastra imágenes o búscalas</span>
          <span className="text-[10px] text-neutral-400 mt-1">Convertidor WebP optimizado integrado</span>
        </div>

        {isCompressing && (
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-2 py-1 animate-pulse">
            <span className="inline-block w-4 h-4 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
            Comprimiendo y convirtiendo imágenes...
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2 pt-2 animate-scaleUp">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square bg-neutral-100 border border-neutral-200 rounded-lg overflow-hidden group">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${img.dataUrl})` }} />
                <button
                  type="button"
                  onClick={() => onRemoveImage(idx)}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 shadow transition-colors duration-200"
                >
                  <X size={10} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-[8px] text-white text-center py-0.5 truncate">
                  {(img.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-700 flex items-center gap-2 font-semibold">
            <Info size={14} className="shrink-0" />
            <span>Debes subir al menos 1 fotografía de tu propiedad para continuar.</span>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-neutral-100">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full h-11 px-6 text-xs font-bold border-neutral-200 hover:bg-neutral-50 transition-colors duration-200"
        >
          Atrás
        </Button>
        <Button
          type="button"
          disabled={isNextDisabled}
          onClick={onNext}
          className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 px-8 text-xs font-bold transition-colors duration-200"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}

/* Paso 7: Precio (Moneda USD + validaciones de límites) */
function StepPrice({
  formData,
  onChange,
  onNext,
  onBack,
}: {
  formData: PublishFormData
  onChange: (updates: Partial<PublishFormData>) => void
  onNext: () => void
  onBack: () => void
}) {
  const priceVal = parseFloat(formData.priceUsd)
  const isRental = formData.operation === 'alquiler'
  const minPrice = isRental ? 100 : 1000
  const maxPrice = 5000000

  // Validaciones
  const hasError = isNaN(priceVal) || priceVal < minPrice || priceVal > maxPrice
  const isNextDisabled = !formData.priceUsd || hasError

  return (
    <div className="space-y-5">
      <div className="publish-form-card-header">
        <span className="publish-step-bubble active text-[10px]">3</span>
        <span>Precio - Valor venta/renta</span>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Precio en USD *</label>
        <div className="relative">
          <Input
            required
            type="number"
            placeholder={isRental ? "Ej: 250" : "Ej: 45000"}
            value={formData.priceUsd}
            onChange={(e) => onChange({ priceUsd: e.target.value })}
            className={`h-11 text-xs pr-12 ${hasError && formData.priceUsd ? 'border-red-500 focus-visible:ring-red-500/20' : 'border-neutral-200'}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">USD</span>
        </div>

        {/* Mensaje de error personalizado en base a la operación */}
        {hasError && formData.priceUsd && (
          <div className="text-[10px] text-red-500 font-bold space-y-0.5">
            {priceVal < minPrice && (
              <span>El precio mínimo permitido para {isRental ? 'rentas' : 'ventas'} es de ${minPrice} USD.</span>
            )}
            {priceVal > maxPrice && (
              <span>El precio máximo permitido es de $5,000,000 USD (verifica que no haya ceros adicionales).</span>
            )}
          </div>
        )}

        <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-lg text-[10px] text-neutral-500 leading-relaxed">
          <strong>Regla de Mercado:</strong> Las propiedades en Cuba se cotizan y comercializan mayoritariamente en dólares norteamericanos (USD) o euros. Introduce el valor correspondiente en USD.
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-neutral-100">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full h-11 px-6 text-xs font-bold border-neutral-200 hover:bg-neutral-50 transition-colors duration-200"
        >
          Atrás
        </Button>
        <Button
          type="button"
          disabled={isNextDisabled}
          onClick={onNext}
          className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 px-8 text-xs font-bold transition-colors duration-200"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}

/* Paso 8: Contacto (Validación estricta de teléfono en Cuba) */
function StepContact({
  formData,
  onChange,
  onBack,
  onClearDraft,
  isSubmitting,
  isEditMode,
  aiStatusMessage,
}: {
  formData: PublishFormData
  onChange: (updates: Partial<PublishFormData>) => void
  onBack: () => void
  onClearDraft: () => void
  isSubmitting: boolean
  isEditMode: boolean
  aiStatusMessage: string | null
}) {
  const isPhoneValid = validatePhone(formData.contactPhone)
  const isSubmitDisabled = !formData.contactName || !isPhoneValid

  return (
    <div className="space-y-5">
      <div className="publish-form-card-header">
        <span className="publish-step-bubble active text-[10px]">4</span>
        <span>Contacto - Contacto y Publicar</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Nombre de contacto *</label>
          <Input
            required
            placeholder="Ej: Alejandro Gómez"
            value={formData.contactName}
            onChange={(e) => onChange({ contactName: e.target.value })}
            className="h-11 border-neutral-200 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">WhatsApp / Teléfono Cuba *</label>
          <Input
            required
            type="tel"
            placeholder="Ej: +53 52345678 o +53 7123456"
            value={formData.contactPhone}
            onChange={(e) => onChange({ contactPhone: e.target.value })}
            onBlur={(e) => onChange({ contactPhone: formatCubanPhoneForDisplay(e.target.value) })}
            className={`h-11 text-xs ${!isPhoneValid && formData.contactPhone ? 'border-red-500 focus-visible:ring-red-500/20' : 'border-neutral-200'}`}
          />
          <span className="text-[9px] text-neutral-500 font-semibold block mt-1">
            Incluye el código de país. Ejemplo: +53 52345678.
          </span>
          {!isPhoneValid && formData.contactPhone && (
            <span className="text-[9px] text-red-500 font-bold block mt-1">
              Teléfono inválido. Usa el formato +53 seguido del número móvil o fijo cubano.
            </span>
          )}
        </div>

      </div>

      <div className="flex justify-between pt-6 border-t border-neutral-100">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="rounded-full h-11 px-6 text-xs font-bold border-neutral-200 hover:bg-neutral-50 transition-colors duration-200"
          >
            Atrás
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClearDraft}
            className="rounded-full h-11 px-4 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors duration-200"
          >
            Borrar Borrador
          </Button>
        </div>
        
        <Button
          type="submit"
          disabled={isSubmitDisabled || isSubmitting}
          className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 px-8 text-xs font-bold transition-colors duration-200 shadow-md"
        >
          {isSubmitting ? (aiStatusMessage || (isEditMode ? 'Guardando...' : 'Publicando...')) : (isEditMode ? 'Guardar Cambios' : 'Publicar Propiedad')}
        </Button>
      </div>
    </div>
  )
}

/* Success Card */
function PublishSuccessCard() {
  return (
    <div className="text-center space-y-4 max-w-md mx-auto py-12 animate-scaleUp">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 mx-auto">
        <FileCheck size={32} />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-neutral-900">¡Publicación recibida!</h2>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Tu propiedad ha sido registrada con éxito. De acuerdo a nuestras políticas de seguridad para Cuba, un revisor verificará los datos antes de que aparezca pública en el catálogo.
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50 rounded-full text-[10px] font-bold text-emerald-800 w-fit mx-auto">
        <Sparkles size={12} />
        <span>Borrador limpiado automáticamente</span>
      </div>
    </div>
  )
}

/* ==========================================================================
   HELPERS & COMPRESSORS
   ========================================================================== */

/* Compresor WebP offline con Canvas */
async function compressToWebP(file: File): Promise<{ dataUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          const MAX_WIDTH = 800
          const MAX_HEIGHT = 800
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto 2D del canvas para compresión.'))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          
          const webpDataUrl = canvas.toDataURL('image/webp', 0.70)
          const approxSize = Math.round((webpDataUrl.length - 22) * 3 / 4)
          resolve({ dataUrl: webpDataUrl, size: approxSize })
        } catch (err) {
          reject(err || new Error('Fallo durante el procesamiento del canvas.'))
        }
      }
      img.onerror = () => reject(new Error('Error al cargar la imagen.'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo.'))
    reader.readAsDataURL(file)
  })
}
