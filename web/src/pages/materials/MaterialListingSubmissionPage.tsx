import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Boxes } from 'lucide-react'
import { createMaterialListing, createOwnedMaterialPhotoPreviews, fetchMyMaterialListings, removeUnattachedMaterialPhotos, updateMaterialListing, uploadMaterialPhotos } from '../../modules/materials/materialRepository'
import { MATERIAL_PHOTO_MAX_BYTES, MATERIAL_PHOTO_MAX_COUNT, validateMaterialPhotoFiles } from '../../modules/materials/materialPhotos'
import { MATERIAL_AVAILABILITIES, MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS, MATERIAL_CURRENCIES, type MaterialCategory, type MaterialCurrency, type MaterialListing } from '../../modules/materials/types'
import { compressCatalogPhoto } from '../../shared/lib/catalogPhotos'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { MultiPhotoUploadField } from '../../shared/ui/MultiPhotoUploadField'
import { PublicationFormShell } from '../publish/PublicationFormShell'
import { PublicationLocationField } from '../publish/PublicationLocationField'
import { PublicationStepLayout, type PublicationStep } from '../publish/PublicationStepLayout'
import { readMarketplaceDraft, removeMarketplaceDraft, saveMarketplaceDraft } from '../publish/marketplaceDraftStorage'

type MaterialListingSubmissionPageProps = {
  onBack: () => void
  onRequireLogin: () => void
  listingId?: string
  userId: string
  draftId?: string
}

const AVAILABILITY_LABELS: Record<MaterialListing['availability'], string> = {
  available: 'Disponible según anunciante',
  limited: 'Disponibilidad limitada',
  out_of_stock: 'Agotado',
  made_to_order: 'Por encargo',
}

const materialPublicationSteps: PublicationStep[] = [
  { label: 'Producto', description: 'Nombra el material y elige su categoría.' },
  { label: 'Ubicación', description: 'Indica la provincia y marca un punto aproximado.' },
  { label: 'Precio y detalles', description: 'Describe precio, moneda y disponibilidad.' },
  { label: 'Fotos', description: 'Añade imágenes del producto.' },
  { label: 'Contacto', description: 'Revisa los datos y envía el anuncio a revisión.' },
]

function makeMaterialSlug(title: string, retryToken: string): string {
  const base = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'material'
  return `${base}-${retryToken}`
}

export function MaterialListingSubmissionPage({ onBack, onRequireLogin, listingId, userId, draftId }: MaterialListingSubmissionPageProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<MaterialCategory>('cemento')
  const [description, setDescription] = useState('')
  const [province, setProvince] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<MaterialCurrency>('USD')
  const [availability, setAvailability] = useState<MaterialListing['availability']>('available')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPaths, setPhotoPaths] = useState<string[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<Array<{ path: string; url: string }>>([])
  const [unavailablePhotoPreviews, setUnavailablePhotoPreviews] = useState(0)
  const [removedPhotoPaths, setRemovedPhotoPaths] = useState<string[]>([])
  const [savedListingId, setSavedListingId] = useState<string | null>(null)
  const [newListingToken] = useState(() => crypto.randomUUID().replaceAll('-', ''))
  const [pendingCreateSlug, setPendingCreateSlug] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [compressingPhotos, setCompressingPhotos] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(Boolean(listingId))
  const [step, setStep] = useState(1)
  const [activeDraftId] = useState(() => draftId ?? crypto.randomUUID())
  const [draftReady, setDraftReady] = useState(!draftId || Boolean(listingId))
  const [draftMessage, setDraftMessage] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  function nextStep() {
    const activePanel = formRef.current?.querySelector<HTMLElement>(`[data-publication-step="${step}"]`)
    const controls = activePanel?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')
    const invalidControl = controls && Array.from(controls).find((control) => !control.checkValidity())
    if (invalidControl) {
      invalidControl.reportValidity()
      return
    }
    if (step === 2 && (!province || !municipality)) {
      setError('Selecciona una provincia y un municipio para continuar.')
      return
    }
    setError('')
    setStep((current) => Math.min(materialPublicationSteps.length, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useSEO({ title: 'Publicar materiales | Cubitat', description: 'Anuncia materiales para construcción y reparación en Cubitat.' })

  useEffect(() => {
    if (!draftId || listingId) return
    let active = true
    void readMarketplaceDraft<Record<string, unknown>>('material', userId, draftId).then((draft) => {
      if (!active || !draft) return
      const value = draft.value
      setTitle(typeof value.title === 'string' ? value.title : '')
      setCategory(typeof value.category === 'string' ? value.category as MaterialCategory : 'cemento')
      setDescription(typeof value.description === 'string' ? value.description : '')
      setProvince(typeof value.province === 'string' ? value.province : '')
      setMunicipality(typeof value.municipality === 'string' ? value.municipality : '')
      setCoordinates(value.coordinates && typeof value.coordinates === 'object' ? value.coordinates as { latitude: number; longitude: number } : null)
      setPrice(typeof value.price === 'string' ? value.price : '')
      setCurrency(typeof value.currency === 'string' ? value.currency as MaterialCurrency : 'USD')
      setAvailability(typeof value.availability === 'string' ? value.availability as MaterialListing['availability'] : 'available')
      setPhone(typeof value.phone === 'string' ? value.phone : '')
      setWhatsapp(typeof value.whatsapp === 'string' ? value.whatsapp : '')
      setPhotoPaths(Array.isArray(value.photoPaths) ? value.photoPaths as string[] : [])
      setPhotoPreviews(Array.isArray(value.photoPreviews) ? value.photoPreviews as Array<{ path: string; url: string }> : [])
      setPhotoFiles(draft.photos)
      setStep(typeof value.step === 'number' ? Math.min(materialPublicationSteps.length, Math.max(1, value.step)) : 1)
    }).catch(() => { if (active) setError('No se pudo recuperar el borrador. Puedes reintentarlo desde Mis materiales.') })
      .finally(() => { if (active) setDraftReady(true) })
    return () => { active = false }
  }, [draftId, listingId, userId])

  useEffect(() => {
    if (!listingId) return
    let active = true
    void fetchMyMaterialListings().then(async (listings) => {
      if (!active) return
      const listing = listings.find((item) => item.id === listingId)
      if (!listing) { setError('No se encontró un anuncio editable.'); return }
      const previewResult = await createOwnedMaterialPhotoPreviews(listing.id, listing.photoPaths)
      if (!active) return
      setTitle(listing.title)
      setCategory(listing.category)
      setDescription(listing.description)
      setProvince(listing.province)
      setMunicipality('')
      setCoordinates(listing.coordinates ?? null)
      setPrice(listing.price == null ? '' : String(listing.price))
      setCurrency(listing.currency)
      setAvailability(listing.availability)
      setPhone(listing.phone || '')
      setWhatsapp(listing.whatsapp || '')
      setPhotoPaths(listing.photoPaths)
      setPhotoPreviews(previewResult.photos)
      setUnavailablePhotoPreviews(previewResult.unavailableCount)
    }).catch(() => { if (active) setError('No se pudo cargar el anuncio para editar.') })
      .finally(() => { if (active) setLoadingExisting(false) })
    return () => { active = false }
  }, [listingId])

  async function handlePhotoSelection(files: File[]) {
    const validation = validateMaterialPhotoFiles(files, photoPaths.length + photoFiles.length)
    if (validation) {
      setError(validation === 'TOO_MANY'
        ? `Puedes adjuntar hasta ${MATERIAL_PHOTO_MAX_COUNT} fotos por anuncio.`
        : validation === 'INVALID_TYPE'
          ? 'Usa archivos WebP, JPEG o PNG.'
          : `Cada foto debe pesar como máximo ${Math.floor(MATERIAL_PHOTO_MAX_BYTES / 1024 / 1024)} MiB.`)
      return
    }

    setCompressingPhotos(true)
    setError('')
    try {
      const compressed = await Promise.all(files.map(compressCatalogPhoto))
      const compressedValidation = validateMaterialPhotoFiles(compressed, photoPaths.length + photoFiles.length)
      if (compressedValidation) throw new Error(`CATALOG_PHOTO_${compressedValidation}`)
      setPhotoFiles((current) => [...current, ...compressed])
    } catch (compressionError) {
      setError(compressionError instanceof Error && compressionError.message === 'IMAGE_DIMENSIONS_TOO_LARGE'
        ? 'Una foto supera la resolución permitida. Reduce su tamaño y vuelve a seleccionarla.'
        : 'No se pudieron preparar todas las fotos. No se añadió ninguna; vuelve a intentarlo.')
    } finally {
      setCompressingPhotos(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (compressingPhotos) {
      setError('Espera a que terminen de prepararse las fotos antes de enviar.')
      return
    }
    const parsedPrice = price.trim() ? Number(price) : null
    const photoValidation = validateMaterialPhotoFiles(photoFiles, photoPaths.length)
    if (photoValidation) {
      setError(photoValidation === 'TOO_MANY'
        ? `Puedes adjuntar hasta ${MATERIAL_PHOTO_MAX_COUNT} fotos por anuncio.`
        : photoValidation === 'INVALID_TYPE'
          ? 'Usa archivos WebP, JPEG o PNG.'
          : `Cada foto debe pesar como máximo ${Math.floor(MATERIAL_PHOTO_MAX_BYTES / 1024 / 1024)} MiB.`)
      return
    }
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setError('Escribe un precio válido o déjalo vacío para indicar “Consultar precio”.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const input = {
        title,
        category,
        description,
        price: parsedPrice,
        currency,
        province,
        coordinates,
        availability,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
      }
      let targetListingId = listingId || savedListingId
      if (!targetListingId) {
        const stableSlug = pendingCreateSlug ?? makeMaterialSlug(title, newListingToken)
        if (!pendingCreateSlug) setPendingCreateSlug(stableSlug)
        targetListingId = await createMaterialListing(input, stableSlug)
        setSavedListingId(targetListingId)
        const resumeSearch = new URLSearchParams(window.location.search)
        resumeSearch.set('edit', targetListingId)
        const search = resumeSearch.toString()
        const resumePath = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
        window.history.replaceState(window.history.state, '', resumePath)
      }
      const uploadedPaths = photoFiles.length
        ? await uploadMaterialPhotos(targetListingId, photoFiles, photoPaths.length)
        : []
      try {
        await updateMaterialListing(targetListingId, { ...input, photoPaths: [...photoPaths, ...uploadedPaths] })
      } catch (updateError) {
        if (updateError instanceof Error && updateError.message === 'MATERIAL_LISTING_PERMISSION_DENIED') {
          await removeUnattachedMaterialPhotos(uploadedPaths)
        } else if (uploadedPaths.length) {
          // The server may have committed the update before the response failed.
          // Keep these paths locally so retry reuses the same objects instead of duplicating uploads.
          const previewResult = await createOwnedMaterialPhotoPreviews(targetListingId, uploadedPaths)
          setPhotoPaths((previous) => Array.from(new Set([...previous, ...uploadedPaths])))
          setPhotoPreviews((previous) => [...previous, ...previewResult.photos.filter((photo) => !previous.some((current) => current.path === photo.path))])
          setUnavailablePhotoPreviews((previous) => previous + previewResult.unavailableCount)
          setPhotoFiles([])
        }
        throw updateError
      }
      await removeUnattachedMaterialPhotos(removedPhotoPaths)
      setPhotoPaths((previous) => Array.from(new Set([...previous, ...uploadedPaths])))
      setRemovedPhotoPaths([])
      setPhotoFiles([])
      if (!listingId) await removeMarketplaceDraft('material', userId, activeDraftId)
      setSubmitted(true)
    } catch (submitError) {
      if (submitError instanceof Error && submitError.message === 'AUTH_REQUIRED') onRequireLogin()
      else if (submitError instanceof Error && submitError.message === 'MATERIAL_PHOTO_TOO_MANY') setError(`Puedes adjuntar hasta ${MATERIAL_PHOTO_MAX_COUNT} fotos por anuncio.`)
      else if (submitError instanceof Error && submitError.message === 'MATERIAL_PHOTO_INVALID_TYPE') setError('Usa archivos WebP, JPEG o PNG.')
      else if (submitError instanceof Error && submitError.message === 'MATERIAL_PHOTO_TOO_LARGE') setError(`Cada foto debe pesar como máximo ${Math.floor(MATERIAL_PHOTO_MAX_BYTES / 1024 / 1024)} MiB.`)
      else if (submitError instanceof Error && submitError.message === 'MATERIAL_PHOTO_UPLOAD_FAILED') setError(listingId ? 'No se pudieron cargar las fotos. No se guardaron cambios; vuelve a intentarlo.' : 'El anuncio quedó guardado como pendiente, pero no se pudieron cargar las fotos. Vuelve a intentarlo para adjuntarlas.')
      else if (submitError instanceof Error && submitError.message === 'MATERIAL_LISTING_PERMISSION_DENIED') setError('No se pudo guardar el anuncio por un permiso de la cuenta. Tus fotos siguen seleccionadas; revisa que estés en la cuenta propietaria e inténtalo de nuevo.')
      else setError('No se pudo confirmar el guardado. Revisa Mis anuncios antes de reintentarlo; tus fotos quedan conservadas.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDraft() {
    try {
      await saveMarketplaceDraft({ kind: 'material', userId, id: activeDraftId, updatedAt: new Date().toISOString(), photos: photoFiles, value: { title, category, description, province, municipality, coordinates, price, currency, availability, phone, whatsapp, photoPaths, photoPreviews, step } })
      setDraftMessage('Borrador guardado en este dispositivo.')
    } catch {
      setDraftMessage('No se pudo guardar el borrador. Comprueba el espacio disponible en este dispositivo.')
    }
  }

  function handleExitWithoutSaving() {
    if (!window.confirm('Los cambios que no guardaste como borrador se descartarán. ¿Quieres salir sin guardar?')) return
    onBack()
  }

  if (loadingExisting) return <main className="mx-auto min-h-[60vh] max-w-3xl px-4 py-20" role="status">Cargando anuncio…</main>
  if (submitted) return <main className="mx-auto min-h-[70vh] max-w-xl px-4 py-24 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-900"><Boxes /></div><h1 className="mt-5 text-2xl font-black">{listingId ? 'Cambios enviados a revisión' : 'Anuncio enviado a revisión'}</h1><p className="mt-2 text-neutral-600">El anuncio aparecerá en el catálogo después de su revisión. El precio y el inventario no son una reserva ni garantía de venta.</p><Button className="mt-6" onClick={onBack}>Volver a mis anuncios</Button></main>

  return (
    <PublicationFormShell onBack={listingId ? onBack : handleExitWithoutSaving} icon={<Boxes size={17} />} eyebrow="Catálogo de materiales" title={listingId ? 'Edita tu anuncio' : 'Anuncia materiales'} description="Los anuncios pasan por revisión. Precio y disponibilidad son datos declarados por el vendedor. Cubitat no procesa pagos, pedidos ni reservas.">
          {!listingId && <div className="mt-5 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" disabled={!draftReady || saving || compressingPhotos} onClick={() => void handleSaveDraft()}>Guardar borrador</Button><Button type="button" variant="outline" disabled={saving || compressingPhotos} onClick={handleExitWithoutSaving}>Salir sin guardar</Button>{draftMessage && <span role="status" className="text-sm text-neutral-600">{draftMessage}</span>}</div>}
          {loadingExisting || !draftReady ? <p role="status" className="mt-7 py-8 text-sm text-neutral-600">Cargando {draftId ? 'borrador' : 'anuncio'}…</p> : <form ref={formRef} noValidate className="mt-7" onSubmit={(event) => void handleSubmit(event)}>
            {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <PublicationStepLayout steps={materialPublicationSteps} step={step} onNavigate={setStep} onBack={() => step === 1 ? listingId ? onBack() : handleExitWithoutSaving() : setStep((current) => current - 1)} onNext={nextStep} isLastStep={step === materialPublicationSteps.length} busy={saving || compressingPhotos} submitLabel={listingId ? 'Guardar y enviar a revisión' : 'Enviar a revisión'}>
            <div data-publication-step="1" hidden={step !== 1}>
            <label className="text-sm font-semibold">Nombre del producto<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={140} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">Categoría<select value={category} onChange={(event) => setCategory(event.target.value as MaterialCategory)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{MATERIAL_CATEGORIES.map((value) => <option key={value} value={value}>{MATERIAL_CATEGORY_LABELS[value]}</option>)}</select></label>
            </div>
            <div data-publication-step="2" hidden={step !== 2}>
            <div data-publication-wide="true"><PublicationLocationField province={province} municipality={municipality} latitude={coordinates?.latitude ?? null} longitude={coordinates?.longitude ?? null} onProvinceChange={(value) => { setProvince(value); setMunicipality(''); setCoordinates(null) }} onMunicipalityChange={(value) => { setMunicipality(value); setCoordinates(null) }} onCoordinatesChange={(latitude, longitude) => setCoordinates({ latitude, longitude })} onClear={() => setCoordinates(null)} /></div>
            </div>
            <div data-publication-step="3" hidden={step !== 3}>
            <label className="text-sm font-semibold">Disponibilidad<select value={availability} onChange={(event) => setAvailability(event.target.value as MaterialListing['availability'])} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{MATERIAL_AVAILABILITIES.map((value) => <option key={value} value={value}>{AVAILABILITY_LABELS[value]}</option>)}</select></label>
            <label className="text-sm font-semibold">Precio<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" placeholder="Deja vacío si no deseas publicarlo" /></label>
            <label className="text-sm font-semibold">Moneda<select value={currency} onChange={(event) => setCurrency(event.target.value as MaterialCurrency)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{MATERIAL_CURRENCIES.map((value) => <option key={value} value={value}>{value === 'USD' ? 'Dólares (USD)' : value === 'CUP' ? 'Pesos cubanos (CUP)' : value === 'MIXED' ? 'Variable / acordar' : value}</option>)}</select></label>
            <label className="text-sm font-semibold">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={20} maxLength={5000} rows={5} className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-2" /></label>
            </div>
            <div data-publication-step="4" hidden={step !== 4} data-publication-wide="true"><MultiPhotoUploadField label="Fotos del producto" files={photoFiles} existingPhotos={photoPaths.map((path) => ({ id: path, src: photoPreviews.find((preview) => preview.path === path)?.url }))} maxCount={MATERIAL_PHOTO_MAX_COUNT} maxSizeLabel={`${Math.floor(MATERIAL_PHOTO_MAX_BYTES / 1024 / 1024)} MiB`} isCompressing={compressingPhotos || saving} onSelectFiles={(files) => void handlePhotoSelection(files)} onRemoveFile={(index) => setPhotoFiles((previous) => previous.filter((_, current) => current !== index))} onRemoveExisting={(photo) => { setPhotoPaths((previous) => previous.filter((path) => path !== photo.id)); setPhotoPreviews((previous) => previous.filter((preview) => preview.path !== photo.id)); setRemovedPhotoPaths((previous) => [...previous, photo.id]) }} /></div>
            <div data-publication-step="5" hidden={step !== 5}>
            <label className="text-sm font-semibold">Teléfono<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={32} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">WhatsApp<input type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={32} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <p className="text-sm text-neutral-600" data-publication-wide="true">El anuncio aparecerá en el catálogo después de su revisión. El precio y el inventario son datos declarados por el vendedor.</p>
            {unavailablePhotoPreviews > 0 && <p role="status" className="text-sm text-amber-800" data-publication-wide="true">No se pudieron cargar {unavailablePhotoPreviews === 1 ? 'una foto guardada' : `${unavailablePhotoPreviews} fotos guardadas`}. Puedes conservarlas o quitarlas del anuncio.</p>}
            </div>
            </PublicationStepLayout>
          </form>}
    </PublicationFormShell>
  )
}
