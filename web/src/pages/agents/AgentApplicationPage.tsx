import { useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, BriefcaseBusiness, FileText, Upload } from 'lucide-react'
import { cubanProvinces } from '../../shared/data/cubaLocations'
import { supabase } from '../../shared/lib/supabaseClient'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { Textarea } from '../../shared/ui/textarea'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png'

type AgentApplicationPageProps = {
  user: User
  onBack: () => void
}

type SubmissionState = 'idle' | 'submitting' | 'submitted' | 'error'

function getSubmissionError(status: number): string {
  if (status === 400) return 'Revisa la provincia, la formación y los documentos seleccionados.'
  if (status === 401) return 'Tu sesión venció. Inicia sesión e inténtalo de nuevo.'
  if (status === 404) return 'La postulación todavía no está habilitada en este entorno.'
  if (status === 409) return 'Ya existe una postulación abierta asociada a tu cuenta.'
  if (status === 413) return 'Los archivos superan el límite permitido.'
  if (status === 429) return 'Ya alcanzaste el límite de envíos. Inténtalo más adelante.'
  return 'No se pudo enviar la postulación. Inténtalo de nuevo más tarde.'
}

export function AgentApplicationPage({ user, onBack }: AgentApplicationPageProps) {
  useSEO({
    title: 'Postulación de agente | Cubitat',
    description: 'Envía tu solicitud para participar en la red de agentes de Cubitat.',
  })

  const [province, setProvince] = useState('')
  const [educationTitle, setEducationTitle] = useState('')
  const [experience, setExperience] = useState('')
  const [cv, setCv] = useState<File | null>(null)
  const [diploma, setDiploma] = useState<File | null>(null)
  const [state, setState] = useState<SubmissionState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (!province || educationTitle.trim().length < 2 || educationTitle.length > 160 || experience.length > 1200) {
      setState('error')
      setErrorMessage('Completa la provincia y la formación. Revisa también el límite de experiencia.')
      return
    }
    if (!cv || !diploma) {
      setState('error')
      setErrorMessage('Adjunta tu currículum y el comprobante de formación.')
      return
    }
    if (cv.size < 1 || diploma.size < 1 || cv.size > MAX_FILE_SIZE || diploma.size > MAX_FILE_SIZE) {
      setState('error')
      setErrorMessage('Cada archivo debe pesar como máximo 10 MB.')
      return
    }

    setState('submitting')
    try {
      const { data, error } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token
      if (error || !accessToken || !user.id) {
        setState('error')
        setErrorMessage(getSubmissionError(401))
        return
      }

      const body = new FormData()
      body.set('province', province)
      body.set('education_title', educationTitle.trim())
      body.set('experience_summary', experience.trim())
      body.set('cv', cv)
      body.set('diploma', diploma)

      const response = await fetch('/api/phase3/agent-applications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body,
      })

      if (!response.ok) {
        setState('error')
        setErrorMessage(getSubmissionError(response.status))
        return
      }

      setState('submitted')
    } catch {
      setState('error')
      setErrorMessage('No se pudo conectar para enviar la postulación. Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  if (state === 'submitted') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6" aria-labelledby="application-success-title">
        <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
            <FileText aria-hidden="true" />
          </div>
          <h1 id="application-success-title" className="text-2xl font-bold text-neutral-950">Recibimos tu postulación</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">La solicitud quedó registrada como pendiente de revisión. La confirmación por correo todavía no está habilitada en esta versión de pruebas.</p>
          <Button className="mt-6" type="button" variant="outline" onClick={onBack}>Volver al inicio</Button>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12" aria-labelledby="agent-application-title">
      <Button className="mb-5 -ml-3" type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> Volver
      </Button>
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
          <BriefcaseBusiness aria-hidden="true" />
        </div>
        <h1 id="agent-application-title" className="text-2xl font-bold text-neutral-950 sm:text-3xl">Postúlate como agente</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
          Cuéntanos tu formación y experiencia. La graduación de nivel superior es un requisito; la experiencia ayuda a valorar la solicitud.
        </p>

        <form className="mt-7 space-y-5" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-800" htmlFor="agent-application-province">Provincia principal</label>
            <select
              id="agent-application-province"
              className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-950 shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-600/20"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              required
            >
              <option value="">Selecciona una provincia</option>
              {cubanProvinces.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-800" htmlFor="agent-application-education">Título de nivel superior</label>
            <Input
              id="agent-application-education"
              autoComplete="off"
              value={educationTitle}
              onChange={(event) => setEducationTitle(event.target.value)}
              maxLength={160}
              placeholder="Ej.: Licenciatura en Derecho"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-800" htmlFor="agent-application-experience">Experiencia relacionada (opcional)</label>
            <Textarea
              id="agent-application-experience"
              value={experience}
              onChange={(event) => setExperience(event.target.value)}
              maxLength={1200}
              rows={4}
              placeholder="Describe brevemente tu experiencia en gestión de procesos o documentos."
            />
            <p className="mt-1 text-right text-xs text-neutral-500">{experience.length}/1200</p>
          </div>

          <FileField id="agent-application-cv" label="Currículum" file={cv} onChange={setCv} />
          <FileField id="agent-application-diploma" label="Título o comprobante de graduación" file={diploma} onChange={setDiploma} />

          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
            Los documentos se guardan en almacenamiento privado y solo se usan para evaluar la solicitud. El correo receptor es provisional; la notificación automatizada y la eliminación programada 30 días después de la decisión todavía no están activas. No envíes documentos reales mientras esta función siga en pruebas.
          </div>

          {errorMessage && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</p>}

          <Button className="w-full sm:w-auto" type="submit" disabled={state === 'submitting'}>
            <Upload aria-hidden="true" /> {state === 'submitting' ? 'Enviando…' : 'Enviar postulación'}
          </Button>
        </form>
      </section>
    </main>
  )
}

function FileField({
  id,
  label,
  file,
  onChange,
}: {
  id: string
  label: string
  file: File | null
  onChange: (file: File | null) => void
}) {
  const tooLarge = Boolean(file && file.size > MAX_FILE_SIZE)
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-neutral-800" htmlFor={id}>{label}</label>
      <Input
        id={id}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={(event) => onChange(event.currentTarget.files?.[0] ?? null)}
        aria-describedby={`${id}-help`}
        required
        className="h-auto min-h-11 py-2 file:mr-3 file:rounded file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-emerald-900"
      />
      <p id={`${id}-help`} className={`mt-1 text-xs ${tooLarge ? 'text-red-700' : 'text-neutral-500'}`}>
        {file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, JPG o PNG · máximo 10 MB'}
      </p>
    </div>
  )
}
