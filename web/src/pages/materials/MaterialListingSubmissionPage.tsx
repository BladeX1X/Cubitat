import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Boxes } from 'lucide-react'
import { createMaterialListing, fetchMyMaterialListings, removeUnattachedMaterialPhotos, updateMaterialListing, uploadMaterialPhotos } from '../../modules/materials/materialRepository'
import { MATERIAL_PHOTO_MAX_BYTES, MATERIAL_PHOTO_MAX_COUNT, validateMaterialPhotoFiles } from '../../modules/materials/materialPhotos'
import { MATERIAL_AVAILABILITIES, MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABELS, MATERIAL_CURRENCIES, type MaterialCategory, type MaterialCurrency, type MaterialListing } from '../../modules/materials/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'

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
  const [removedPhotoPaths, setRemovedPhotoPaths] = useState<string[]>([])
  const [savedListingId, setSavedListingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(Boolean(listingId))

  useSEO({ title: 'Publicar materiales | Cubitat', description: 'Anuncia materiales para construcción y reparación en Cubitat.' })

  useEffect(() => {
    if (!listingId) return
    let active = true
    void fetchMyMaterialListings().then((listings) => {
      if (!active) return
      const listing = listings.find((item) => item.id === listingId)
      if (!listing) { setError('No se encontró un anuncio editable.'); return }
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
    }).catch(() => { if (active) setError('No se pudo cargar el anuncio para editar.') })
      .finally(() => { if (active) setLoadingExisting(false) })
    return () => { active = false }
  }, [listingId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
        targetListingId = await createMaterialListing(input)
        setSavedListingId(targetListingId)
      }
      const uploadedPaths = await uploadMaterialPhotos(targetListingId, photoFiles, photoPaths.length)
      try {
        await updateMaterialListing(targetListingId, { ...input, photoPaths: [...photoPaths, ...uploadedPaths] })
      } catch (updateError) {
        await removeUnattachedMaterialPhotos(uploadedPaths)
        throw updateError
      }
      await removeUnattachedMaterialPhotos(removedPhotoPaths)
      setPhotoPaths((previous) => [...previous, ...uploadedPaths])
      setRemovedPhotoPaths([])
      setPhotoFiles([])
      setSubmitted(true)
    } catch (submitError) {
      if (submitError instanceof Error && submitError.message === 'AUTH_REQUIRED') onRequireLogin()
      else if (submitError instanceof Error && submitError.message === 'MATERIAL_PHOTO_TOO_MANY') setError(`Puedes adjuntar hasta ${MATERIAL_PHOTO_MAX_COUNT} fotos por anuncio.`)
      else if (submitError instanceof Error && submitError.message === 'MATERIAL_PHOTO_INVALID_TYPE') setError('Usa archivos WebP, JPEG o PNG.')
      else if (submitError instanceof Error && submitError.message === 'MATERIAL_PHOTO_TOO_LARGE') setError(`Cada foto debe pesar como máximo ${Math.floor(MATERIAL_PHOTO_MAX_BYTES / 1024 / 1024)} MiB.`)
      else if (submitError instanceof Error && submitError.message === 'MATERIAL_PHOTO_UPLOAD_FAILED') setError(listingId ? 'No se pudieron cargar las fotos. No se guardaron cambios; vuelve a intentarlo.' : 'El anuncio quedó guardado como pendiente, pero no se pudieron cargar las fotos. Vuelve a intentarlo para adjuntarlas.')
      else setError('No se pudo guardar el anuncio. Comprueba la conexión e inténtalo otra vez.')
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
            <label className="text-sm font-semibold sm:col-span-2">Fotos del producto<input key={photoFiles.length ? 'selected' : 'empty'} type="file" accept="image/webp,image/jpeg,image/png" multiple onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); const validation = validateMaterialPhotoFiles(files, photoPaths.length); if (validation) { setError(validation === 'TOO_MANY' ? `Puedes adjuntar hasta ${MATERIAL_PHOTO_MAX_COUNT} fotos por anuncio.` : validation === 'INVALID_TYPE' ? 'Usa archivos WebP, JPEG o PNG.' : `Cada foto debe pesar como máximo ${Math.floor(MATERIAL_PHOTO_MAX_BYTES / 1024 / 1024)} MiB.`); setPhotoFiles([]); return } setError(''); setPhotoFiles(files) }} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:font-semibold" /><span className="mt-1 block text-xs font-normal text-neutral-500">Hasta {MATERIAL_PHOTO_MAX_COUNT} fotos, WebP/JPEG/PNG, máximo {Math.floor(MATERIAL_PHOTO_MAX_BYTES / 1024 / 1024)} MiB por foto. Las fotos nuevas permanecen privadas hasta que se apruebe el anuncio. {photoPaths.length > 0 && `Este anuncio tiene ${photoPaths.length} foto${photoPaths.length === 1 ? '' : 's'} guardada${photoPaths.length === 1 ? '' : 's'}.`}</span>{photoFiles.length > 0 && <span className="mt-1 block text-xs text-neutral-600">{photoFiles.length} archivo(s) listo(s) para subir.</span>}</label>
            {photoPaths.length > 0 && <ul className="sm:col-span-2" aria-label="Fotos guardadas">{photoPaths.map((path, index) => <li key={path} className="flex items-center justify-between gap-3 border-b border-neutral-100 py-2 text-sm"><span className="truncate text-neutral-600">Foto {index + 1}</span><button type="button" className="min-h-10 px-2 font-semibold text-red-700 underline" onClick={() => { setPhotoPaths((previous) => previous.filter((candidate) => candidate !== path)); setRemovedPhotoPaths((previous) => [...previous, path]) }}>Quitar</button></li>)}</ul>}
            {error && <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="sm:col-span-2"><Button type="submit" className="min-h-11" disabled={saving}>{saving ? 'Enviando…' : listingId ? 'Guardar y enviar a revisión' : 'Enviar a revisión'}</Button></div>
          </form>
        </section>
      </div>
    </main>
  )
}
