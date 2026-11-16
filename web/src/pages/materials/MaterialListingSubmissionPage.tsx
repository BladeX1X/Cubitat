import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Boxes } from 'lucide-react'
import { createMaterialListing, createOwnedMaterialPhotoPreviews, fetchMyMaterialListings, removeUnattachedMaterialPhotos, updateMaterialListing, uploadMaterialPhotos } from '../../modules/materials/materialRepository'
import { MATERIAL_PHOTO_MAX_BYTES, MATERIAL_PHOTO_MAX_COUNT, validateMaterialPhotoFiles } from '../../modules/materials/materialPhotos'
import { MATERIAL_AVAILABILITIES, MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS, MATERIAL_CURRENCIES, type MaterialCategory, type MaterialCurrency, type MaterialListing } from '../../modules/materials/types'
import { compressCatalogPhoto } from '../../shared/lib/catalogPhotos'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { MultiPhotoUploadField } from '../../shared/ui/MultiPhotoUploadField'

type MaterialListingSubmissionPageProps = {
  onBack: () => void
  onRequireLogin: () => void
  listingId?: string
}

const AVAILABILITY_LABELS: Record<MaterialListing['availability'], string> = {
  available: 'Disponible según anunciante',
  limited: 'Disponibilidad limitada',
  out_of_stock: 'Agotado',
  made_to_order: 'Por encargo',
}

function makeMaterialSlug(title: string, retryToken: string): string {
  const base = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'material'
  return `${base}-${retryToken}`
}

export function MaterialListingSubmissionPage({ onBack, onRequireLogin, listingId }: MaterialListingSubmissionPageProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<MaterialCategory>('cemento')
  const [description, setDescription] = useState('')
  const [province, setProvince] = useState('')
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

  useSEO({ title: 'Publicar materiales | Cubitat', description: 'Anuncia materiales para construcción y reparación en Cubitat.' })

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

  if (loadingExisting) return <main className="mx-auto min-h-[60vh] max-w-3xl px-4 py-20" role="status">Cargando anuncio…</main>
  if (submitted) return <main className="mx-auto min-h-[70vh] max-w-xl px-4 py-24 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-900"><Boxes /></div><h1 className="mt-5 text-2xl font-black">{listingId ? 'Cambios enviados a revisión' : 'Anuncio enviado a revisión'}</h1><p className="mt-2 text-neutral-600">El anuncio aparecerá en el catálogo después de su revisión. El precio y el inventario no son una reserva ni garantía de venta.</p><Button className="mt-6" onClick={onBack}>Volver a mis anuncios</Button></main>

  return (
    <main className="min-h-[75vh] bg-neutral-50 px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-white"><ArrowLeft size={18} />Volver</button>
        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800"><Boxes size={17} />Catálogo de materiales</p>
          <h1 className="mt-2 text-3xl font-black text-neutral-900">{listingId ? 'Edita tu anuncio' : 'Anuncia materiales'}</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Los anuncios pasan por revisión. Precio y disponibilidad son datos declarados por el vendedor. Cubitat no procesa pagos, pedidos ni reservas.</p>
          <form className="mt-7 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
            <label className="text-sm font-semibold">Nombre del producto<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={140} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">Categoría<select value={category} onChange={(event) => setCategory(event.target.value as MaterialCategory)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{MATERIAL_CATEGORIES.map((value) => <option key={value} value={value}>{MATERIAL_CATEGORY_LABELS[value]}</option>)}</select></label>
            <label className="text-sm font-semibold">Provincia<input value={province} onChange={(event) => setProvince(event.target.value)} required minLength={2} maxLength={100} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">Disponibilidad<select value={availability} onChange={(event) => setAvailability(event.target.value as MaterialListing['availability'])} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{MATERIAL_AVAILABILITIES.map((value) => <option key={value} value={value}>{AVAILABILITY_LABELS[value]}</option>)}</select></label>
            <label className="text-sm font-semibold">Precio<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" placeholder="Deja vacío si no deseas publicarlo" /></label>
            <label className="text-sm font-semibold">Moneda<select value={currency} onChange={(event) => setCurrency(event.target.value as MaterialCurrency)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{MATERIAL_CURRENCIES.map((value) => <option key={value} value={value}>{value === 'MIXED' ? 'Variable / acordar' : value}</option>)}</select></label>
            <label className="text-sm font-semibold">Teléfono<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={32} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">WhatsApp<input type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={32} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={20} maxLength={5000} rows={5} className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-2" /></label>
            <MultiPhotoUploadField label="Fotos del producto" files={photoFiles} existingPhotos={photoPaths.map((path) => ({ id: path, src: photoPreviews.find((preview) => preview.path === path)?.url }))} maxCount={MATERIAL_PHOTO_MAX_COUNT} maxSizeLabel={`${Math.floor(MATERIAL_PHOTO_MAX_BYTES / 1024 / 1024)} MiB`} isCompressing={compressingPhotos || saving} onSelectFiles={(files) => void handlePhotoSelection(files)} onRemoveFile={(index) => setPhotoFiles((previous) => previous.filter((_, current) => current !== index))} onRemoveExisting={(photo) => { setPhotoPaths((previous) => previous.filter((path) => path !== photo.id)); setPhotoPreviews((previous) => previous.filter((preview) => preview.path !== photo.id)); setRemovedPhotoPaths((previous) => [...previous, photo.id]) }} />
            {unavailablePhotoPreviews > 0 && <p role="status" className="sm:col-span-2 text-sm text-amber-800">No se pudieron cargar {unavailablePhotoPreviews === 1 ? 'una foto guardada' : `${unavailablePhotoPreviews} fotos guardadas`}. Puedes conservarlas o quitarlas del anuncio.</p>}
            {error && <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="sm:col-span-2"><Button type="submit" className="min-h-11" disabled={saving || compressingPhotos}>{compressingPhotos ? 'Preparando fotos…' : saving ? 'Enviando…' : listingId ? 'Guardar y enviar a revisión' : 'Enviar a revisión'}</Button></div>
          </form>
        </section>
      </div>
    </main>
  )
}
