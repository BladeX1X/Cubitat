import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BriefcaseBusiness } from 'lucide-react'
import { createHomeServiceProvider, fetchMyHomeServiceProviders, updateHomeServiceProvider } from '../../modules/home-services/homeServiceRepository'
import { compressHomeServicePhoto, HOME_SERVICE_PHOTO_MAX_BYTES, HOME_SERVICE_PHOTO_MAX_COUNT, isHomeServicePhotoPath, removeUnattachedHomeServicePhotos, uploadHomeServicePhotos, validateHomeServicePhotoFiles } from '../../modules/home-services/homeServicePhotos'
import { HOME_SERVICE_CATEGORIES, HOME_SERVICE_CATEGORY_LABELS, type HomeServiceCategory } from '../../modules/home-services/types'
import { cubanMunicipalities } from '../../shared/data/cubaLocations'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { MultiPhotoUploadField, type ExistingUploadPhoto } from '../../shared/ui/MultiPhotoUploadField'
import { PublicationFormShell } from '../publish/PublicationFormShell'
import { PublicationLocationField } from '../publish/PublicationLocationField'
import { PublicationStepLayout, type PublicationStep } from '../publish/PublicationStepLayout'

type ServiceProviderSubmissionPageProps = {
  onBack: () => void
  onRequireLogin: () => void
  profileId?: string
}

const servicePublicationSteps: PublicationStep[] = [
  { label: 'Servicio', description: 'Presenta tu negocio y el trabajo que realizas.' },
  { label: 'Zona y mapa', description: 'Indica dónde trabajas y marca un punto aproximado.' },
  { label: 'Fotos', description: 'Añade imágenes de tus trabajos.' },
  { label: 'Contacto', description: 'Revisa los datos y envía el perfil a revisión.' },
]

export function ServiceProviderSubmissionPage({ onBack, onRequireLogin, profileId }: ServiceProviderSubmissionPageProps) {
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<HomeServiceCategory>('plomeria')
  const [description, setDescription] = useState('')
  const [province, setProvince] = useState('')
  const [municipality, setMunicipality] = useState('')
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
  const [step, setStep] = useState(1)
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
    setStep((current) => Math.min(servicePublicationSteps.length, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
      const profileMunicipality = profile.municipalities.find((value) => cubanMunicipalities[profile.province]?.includes(value)) ?? ''
      setMunicipality(profileMunicipality)
      setMunicipalities(profile.municipalities.filter((value) => value !== profileMunicipality).join(', '))
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
        municipalities: Array.from(new Set([municipality, ...municipalities.split(',').map((value) => value.trim())].filter(Boolean))).slice(0, 30),
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
          {loadingProfile ? <p className="mt-7 py-8 text-sm text-neutral-600">Cargando perfil…</p> : <form ref={formRef} noValidate className="mt-7" onSubmit={(event) => void handleSubmit(event)}>
            {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <PublicationStepLayout steps={servicePublicationSteps} step={step} onNavigate={setStep} onBack={() => step === 1 ? onBack() : setStep((current) => current - 1)} onNext={nextStep} isLastStep={step === servicePublicationSteps.length} busy={saving || compressingPhotos} submitLabel={profileId ? 'Guardar y enviar a revisión' : 'Enviar a revisión'}>
            <div data-publication-step="1" hidden={step !== 1}>
            <label className="text-sm font-semibold">Nombre del profesional o negocio<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={120} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">Servicio<select value={category} onChange={(event) => setCategory(event.target.value as HomeServiceCategory)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{HOME_SERVICE_CATEGORIES.map((value) => <option key={value} value={value}>{HOME_SERVICE_CATEGORY_LABELS[value]}</option>)}</select></label>
            <label className="text-sm font-semibold">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={30} maxLength={5000} rows={6} className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Describe el trabajo que realizas y tu experiencia." /></label>
            </div>
            <div data-publication-step="2" hidden={step !== 2}>
            <div data-publication-wide="true"><PublicationLocationField province={province} municipality={municipality} latitude={coordinates?.latitude ?? null} longitude={coordinates?.longitude ?? null} onProvinceChange={(value) => { setProvince(value); setMunicipality(''); setCoordinates(null) }} onMunicipalityChange={(value) => { setMunicipality(value); setCoordinates(null) }} onCoordinatesChange={(latitude, longitude) => setCoordinates({ latitude, longitude })} onClear={() => setCoordinates(null)} /></div>
            <label className="mt-4 block text-sm font-semibold">Otros municipios o zonas de cobertura<input value={municipalities} onChange={(event) => setMunicipalities(event.target.value)} maxLength={1000} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" placeholder="Opcional; separados por comas" /></label>
            </div>
            <div data-publication-step="3" hidden={step !== 3} data-publication-wide="true"><MultiPhotoUploadField label="Fotos de tus trabajos" files={photoFiles} existingPhotos={galleryReferences.map((reference, index): ExistingUploadPhoto => ({ id: reference, src: galleryUrls[index] }))} maxCount={HOME_SERVICE_PHOTO_MAX_COUNT} maxSizeLabel={`${Math.floor(HOME_SERVICE_PHOTO_MAX_BYTES / 1024 / 1024)} MiB`} isCompressing={compressingPhotos || saving} onSelectFiles={(files) => void handlePhotoSelection(files)} onRemoveFile={(index) => setPhotoFiles((previous) => previous.filter((_, current) => current !== index))} onRemoveExisting={(photo) => { const index = galleryReferences.indexOf(photo.id); if (index < 0) return; const reference = galleryReferences[index]; setGalleryReferences((previous) => previous.filter((_, current) => current !== index)); setGalleryUrls((previous) => previous.filter((_, current) => current !== index)); if (isHomeServicePhotoPath(reference)) setRemovedPhotoPaths((previous) => [...previous, reference]) }} /></div>
            <div data-publication-step="4" hidden={step !== 4}>
            <label className="text-sm font-semibold">Teléfono<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={32} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">WhatsApp<input type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={32} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <p className="text-sm text-neutral-600" data-publication-wide="true">El perfil se enviará a revisión antes de aparecer en el directorio.</p>
            </div>
            </PublicationStepLayout>
          </form>}
    </PublicationFormShell>
  )
}
