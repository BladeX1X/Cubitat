import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, BriefcaseBusiness } from 'lucide-react'
import { createHomeServiceProvider, fetchMyHomeServiceProviders, updateHomeServiceProvider } from '../../modules/home-services/homeServiceRepository'
import { HOME_SERVICE_CATEGORIES, HOME_SERVICE_CATEGORY_LABELS, type HomeServiceCategory } from '../../modules/home-services/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'

type ServiceProviderSubmissionPageProps = {
  onBack: () => void
  onRequireLogin: () => void
  profileId?: string
}

function parseGalleryUrls(input: string): string[] | null {
  const entries = input.split(/\r?\n/).map((url) => url.trim()).filter(Boolean)
  if (entries.length > 10) return null
  const valid = entries.every((entry) => {
    try { return new URL(entry).protocol === 'https:' } catch { return false }
  })
  return valid ? entries : null
}

export function ServiceProviderSubmissionPage({ onBack, onRequireLogin, profileId }: ServiceProviderSubmissionPageProps) {
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<HomeServiceCategory>('plomeria')
  const [description, setDescription] = useState('')
  const [province, setProvince] = useState('')
  const [municipalities, setMunicipalities] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [galleryInput, setGalleryInput] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(Boolean(profileId))

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
      setPhone(profile.phone || '')
      setWhatsapp(profile.whatsapp || '')
      setGalleryInput(profile.galleryUrls.join('\n'))
    }).catch(() => { if (active) setError('No se pudo cargar el perfil para editar.') })
      .finally(() => { if (active) setLoadingProfile(false) })
    return () => { active = false }
  }, [profileId])

  useSEO({ title: 'Publicar un servicio para el hogar | Cubitat', description: 'Presenta tus servicios para vivienda en el directorio de Cubitat.' })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const galleryUrls = parseGalleryUrls(galleryInput)
    if (galleryUrls === null) {
      setError('Usa hasta 10 enlaces HTTPS válidos, uno por línea.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const input = {
        displayName,
        category,
        description,
        province,
        municipalities: municipalities.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 30),
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        galleryUrls,
      }
      if (profileId) await updateHomeServiceProvider(profileId, input)
      else await createHomeServiceProvider(input)
      setSubmitted(true)
    } catch (submitError) {
      if (submitError instanceof Error && submitError.message === 'AUTH_REQUIRED') {
        onRequireLogin()
      } else {
        setError('No se pudo guardar el perfil. Comprueba la conexión e inténtalo otra vez.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (submitted) return <main className="mx-auto min-h-[70vh] max-w-xl px-4 py-24 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><BriefcaseBusiness /></div><h1 className="mt-5 text-2xl font-black">Perfil enviado a revisión</h1><p className="mt-2 text-neutral-600">El perfil aparecerá en el directorio después de la revisión. Publicarlo no acredita licencias ni certifica el servicio.</p><Button className="mt-6" onClick={onBack}>Volver al directorio</Button></main>

  return (
    <main className="min-h-[75vh] bg-neutral-50 px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-white"><ArrowLeft size={18} />Volver</button>
        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800"><BriefcaseBusiness size={17} />Directorio profesional</p>
          <h1 className="mt-2 text-3xl font-black text-neutral-900">{profileId ? 'Edita tu perfil' : 'Presenta tus servicios'}</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">El perfil queda pendiente de revisión antes de aparecer en público. No lo presentes como licencia o certificación emitida por Cubitat.</p>
          {loadingProfile ? <p className="mt-7 py-8 text-sm text-neutral-600">Cargando perfil…</p> : <form className="mt-7 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
            <label className="text-sm font-semibold">Nombre del profesional o negocio<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={120} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">Servicio<select value={category} onChange={(event) => setCategory(event.target.value as HomeServiceCategory)} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">{HOME_SERVICE_CATEGORIES.map((value) => <option key={value} value={value}>{HOME_SERVICE_CATEGORY_LABELS[value]}</option>)}</select></label>
            <label className="text-sm font-semibold">Provincia<input value={province} onChange={(event) => setProvince(event.target.value)} required minLength={2} maxLength={100} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">Municipios o zonas<input value={municipalities} onChange={(event) => setMunicipalities(event.target.value)} maxLength={1000} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" placeholder="Separados por comas" /></label>
            <label className="text-sm font-semibold">Teléfono<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={32} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold">WhatsApp<input type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={32} className="mt-1 block min-h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} required minLength={30} maxLength={5000} rows={6} className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-2" placeholder="Describe el trabajo que realizas y tu experiencia." /></label>
            <label className="text-sm font-semibold sm:col-span-2">Galería (enlaces de imágenes HTTPS)<textarea value={galleryInput} onChange={(event) => setGalleryInput(event.target.value)} rows={3} className="mt-1 block w-full rounded-xl border border-neutral-300 px-3 py-2 font-normal" placeholder="Un enlace por línea; máximo 10" /><span className="mt-1 block text-xs font-normal text-neutral-500">Usa imágenes propias o con permiso para publicar. La carga directa de archivos se incorporará en un hito posterior.</span></label>
            {error && <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="sm:col-span-2"><Button type="submit" className="min-h-11" disabled={saving}>{saving ? 'Guardando…' : profileId ? 'Guardar y enviar a revisión' : 'Enviar a revisión'}</Button></div>
          </form>}
        </section>
      </div>
    </main>
  )
}
