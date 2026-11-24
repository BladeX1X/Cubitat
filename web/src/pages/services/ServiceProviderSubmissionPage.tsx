import { useEffect, useState, type FormEvent } from 'react'
import { BriefcaseBusiness } from 'lucide-react'
import { createHomeServiceProvider, fetchMyHomeServiceProviders, updateHomeServiceProvider } from '../../modules/home-services/homeServiceRepository'
import { compressHomeServicePhoto, HOME_SERVICE_PHOTO_MAX_BYTES, HOME_SERVICE_PHOTO_MAX_COUNT, isHomeServicePhotoPath, removeUnattachedHomeServicePhotos, uploadHomeServicePhotos, validateHomeServicePhotoFiles } from '../../modules/home-services/homeServicePhotos'
import { HOME_SERVICE_CATEGORIES, HOME_SERVICE_CATEGORY_LABELS, type HomeServiceCategory } from '../../modules/home-services/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { MultiPhotoUploadField, type ExistingUploadPhoto } from '../../shared/ui/MultiPhotoUploadField'
import { PublicationFormShell } from '../publish/PublicationFormShell'
import { PublicationLocationField } from '../publish/PublicationLocationField'

type ServiceProviderSubmissionPageProps = {
  onBack: () => void
  onRequireLogin: () => void
  profileId?: string
}

export function ServiceProviderSubmissionPage({ onBack, onRequireLogin, profileId }: ServiceProviderSubmissionPageProps) {
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<HomeServiceCategory>('plomeria')
  const [description, setDescription] = useState('')
  const [province, setProvince] = useState('')
  const [municipalities, setMunicipalities] = useState('')
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [galleryReferences, setGalleryReferences] = useState<string[]>([])
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [pendingPhotoUploads, setPendingPhotoUploads] = useState<{ file: File; path: string }[]>([])
  const [removedPhotoPaths, setRemovedPhotoPaths] = useState<string[]>([])
  const [compressingPhotos, setCompressingPhotos] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(Boolean(profileId))
  const [newProviderId] = useState(() => crypto.randomUUID())

  useEffect(() => {
    if (!profileId) return
    let active = true
    void fetchMyHomeServiceProviders().then((profiles) => {
      if (!active) return
      const profile = profiles.find((item) => item.id === profileId)
      if (!profile || profile.status === 'published') {
        setError('Este perfil no se puede editar desde aquí.')
        return
      }
      setDisplayName(profile.displayName)
      setCategory(profile.category)
      setDescription(profile.description)
      setProvince(profile.province)
      setMunicipalities(profile.municipalities.join(', '))
      setCoordinates(profile.coordinates ?? null)
      setPhone(profile.phone || '')
      setWhatsapp(profile.whatsapp || '')
      setGalleryReferences(profile.galleryReferences)
      setGalleryUrls(profile.galleryUrls)
    }).catch(() => { if (active) setError('No se pudo cargar el perfil para editar.') })
      .finally(() => { if (active) setLoadingProfile(false) })
    return () => { active = false }
  }, [profileId])

  useSEO({ title: 'Publicar un servicio para el hogar | Cubitat', description: 'Presenta tus servicios para vivienda en el directorio de Cubitat.' })

  async function handlePhotoSelection(files: File[]) {
    const validation = validateHomeServicePhotoFiles(files, galleryReferences.length + photoFiles.length)
    if (validation) {
      setError(validation === 'TOO_MANY' ? `Puedes adjuntar hasta ${HOME_SERVICE_PHOTO_MAX_COUNT} fotos por perfil.` : validation === 'INVALID_TYPE' ? 'Usa archivos WebP, JPEG o PNG.' : `Cada foto debe pesar como máximo ${Math.floor(HOME_SERVICE_PHOTO_MAX_BYTES / 1024 / 1024)} MiB.`)
      return
    }
    setCompressingPhotos(true)
    setError('')
    try {
      const compressed = await Promise.all(files.map(compressHomeServicePhoto))
      const compressedValidation = validateHomeServicePhotoFiles(compressed, galleryReferences.length + photoFiles.length)
      if (compressedValidation) throw new Error(`HOME_SERVICE_PHOTO_${compressedValidation}`)
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
    const photoValidation = validateHomeServicePhotoFiles(photoFiles, galleryReferences.length)
    if (photoValidation) {
      setError(photoValidation === 'TOO_MANY' ? `Puedes adjuntar hasta ${HOME_SERVICE_PHOTO_MAX_COUNT} fotos por perfil.` : photoValidation === 'INVALID_TYPE' ? 'Usa archivos WebP, JPEG o PNG.' : `Cada foto debe pesar como máximo ${Math.floor(HOME_SERVICE_PHOTO_MAX_BYTES / 1024 / 1024)} MiB.`)
      return
    }
    setSaving(true)
    setError('')
    let newlyUploadedPaths: string[] = []
    try {
      const pathsByFile = new Map(pendingPhotoUploads.map(({ file, path }) => [file, path]))
      const filesToUpload = photoFiles.filter((file) => !pathsByFile.has(file))
      const activePendingCount = photoFiles.filter((file) => pathsByFile.has(file)).length
      newlyUploadedPaths = filesToUpload.length
        ? await uploadHomeServicePhotos(filesToUpload, galleryReferences.length + activePendingCount)
        : []
      filesToUpload.forEach((file, index) => pathsByFile.set(file, newlyUploadedPaths[index]))
      const uploadedPaths = photoFiles.map((file) => pathsByFile.get(file)).filter((path): path is string => Boolean(path))
      setPendingPhotoUploads(Array.from(pathsByFile, ([file, path]) => ({ file, path })))
      const input = {
        displayName,
        category,
        description,
        province,
        municipalities: municipalities.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 30),
        coordinates,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        galleryUrls: [...galleryReferences, ...uploadedPaths],
      }
      if (profileId) await updateHomeServiceProvider(profileId, input)
      else await createHomeServiceProvider(input, newProviderId)
      const selectedFiles = new Set(photoFiles)
      const nowUnselectedPaths = pendingPhotoUploads.filter(({ file }) => !selectedFiles.has(file)).map(({ path }) => path)
      await removeUnattachedHomeServicePhotos([...removedPhotoPaths, ...nowUnselectedPaths])
      setSubmitted(true)
    } catch (submitError) {
      if (submitError instanceof Error && submitError.message === 'AUTH_REQUIRED') {
        if (newlyUploadedPaths.length) await removeUnattachedHomeServicePhotos(newlyUploadedPaths)
        if (newlyUploadedPaths.length) setPendingPhotoUploads((current) => current.filter(({ path }) => !newlyUploadedPaths.includes(path)))
        onRequireLogin()
      } else if (submitError instanceof Error && submitError.message === 'HOME_SERVICE_PROFILE_PERMISSION_DENIED') {
        if (newlyUploadedPaths.length) await removeUnattachedHomeServicePhotos(newlyUploadedPaths)
        if (newlyUploadedPaths.length) setPendingPhotoUploads((current) => current.filter(({ path }) => !newlyUploadedPaths.includes(path)))
        setError('No se pudo guardar el perfil por un permiso de la cuenta. Tus fotos siguen seleccionadas; revisa que estés en la cuenta propietaria e inténtalo de nuevo.')
      } else if (submitError instanceof Error && submitError.message === 'HOME_SERVICE_PHOTO_UPLOAD_FAILED') {
        setError('No se pudieron cargar todas las fotos. El perfil no se actualizó; vuelve a intentarlo.')
      } else if (submitError instanceof Error && submitError.message.startsWith('HOME_SERVICE_PHOTO_')) {
        setError('Revisa el formato, tamaño y cantidad de fotos e inténtalo de nuevo.')
      } else {
        setError('No se pudo confirmar el guardado. Revisa Mis perfiles antes de volver a enviarlo; las fotos quedan conservadas.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (submitted) return <main className="mx-auto min-h-[70vh] max-w-xl px-4 py-24 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><BriefcaseBusiness /></div><h1 className="mt-5 text-2xl font-black">Perfil enviado a revisión</h1><p className="mt-2 text-neutral-600">El perfil aparecerá en el directorio después de la revisión. Publicarlo no acredita licencias ni certifica el servicio.</p><Button className="mt-6" onClick={onBack}>Volver al directorio</Button></main>

  return (
    <PublicationFormShell onBack={onBack} icon={<BriefcaseBusiness size={17} />} eyebrow="Directorio profesional" title={profileId ? 'Edita tu perfil' : 'Presenta tus servicios'} description="El perfil queda pendiente de revisión antes de aparecer en público. No lo presentes como licencia o certificación emitida por Cubitat.">
          {loadingProfile ? <p className="mt-7 py-8 text-sm text-neutral-600">Cargando perfil…</p> : <form className="mt-7 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
            <label className="text-sm font-semibold">Nombre del profesional o negocio<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={120} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">Servicio<select value={category} onChange={(event) => setCategory(event.target.value as HomeServiceCategory)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{HOME_SERVICE_CATEGORIES.map((value) => <option key={value} value={value}>{HOME_SERVICE_CATEGORY_LABELS[value]}</option>)}</select></label>
            <label className="text-sm font-semibold">Provincia<input value={province} onChange={(event) => setProvince(event.target.value)} required minLength={2} maxLength={100} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">Municipios o zonas<input value={municipalities} onChange={(event) => setMunicipalities(event.target.value)} maxLength={1000} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" placeholder="Separados por comas" /></label>
            <label className="text-sm font-semibold">Teléfono<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={32} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">WhatsApp<input type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={32} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={30} maxLength={5000} rows={6} className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Describe el trabajo que realizas y tu experiencia." /></label>
            <PublicationLocationField province={province} municipality={municipalities.split(',')[0]?.trim() || ''} latitude={coordinates?.latitude ?? null} longitude={coordinates?.longitude ?? null} onCoordinatesChange={(latitude, longitude) => setCoordinates({ latitude, longitude })} onClear={() => setCoordinates(null)} />
            <MultiPhotoUploadField label="Fotos de tus trabajos" files={photoFiles} existingPhotos={galleryReferences.map((reference, index): ExistingUploadPhoto => ({ id: reference, src: galleryUrls[index] }))} maxCount={HOME_SERVICE_PHOTO_MAX_COUNT} maxSizeLabel={`${Math.floor(HOME_SERVICE_PHOTO_MAX_BYTES / 1024 / 1024)} MiB`} isCompressing={compressingPhotos || saving} onSelectFiles={(files) => void handlePhotoSelection(files)} onRemoveFile={(index) => setPhotoFiles((previous) => previous.filter((_, current) => current !== index))} onRemoveExisting={(photo) => { const index = galleryReferences.indexOf(photo.id); if (index < 0) return; const reference = galleryReferences[index]; setGalleryReferences((previous) => previous.filter((_, current) => current !== index)); setGalleryUrls((previous) => previous.filter((_, current) => current !== index)); if (isHomeServicePhotoPath(reference)) setRemovedPhotoPaths((previous) => [...previous, reference]) }} />
            {error && <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="sm:col-span-2"><Button type="submit" className="min-h-11" disabled={saving || compressingPhotos}>{compressingPhotos ? 'Preparando fotos…' : saving ? 'Guardando…' : profileId ? 'Guardar y enviar a revisión' : 'Enviar a revisión'}</Button></div>
          </form>}
    </PublicationFormShell>
  )
}
