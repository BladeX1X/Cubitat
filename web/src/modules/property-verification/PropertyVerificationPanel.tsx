import { useEffect, useState } from 'react'
import { FileCheck2, Loader2, Upload, X } from 'lucide-react'
import { supabase } from '../../shared/lib/supabaseClient'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'

type VerificationStatus = 'pending' | 'approved' | 'rejected'

type VerificationRequest = {
  status: VerificationStatus
  rejection_reason: string | null
  created_at: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

function statusCopy(request: VerificationRequest) {
  if (request.status === 'approved') return 'Documento aprobado por revisión administrativa.'
  if (request.status === 'rejected') return request.rejection_reason || 'La solicitud fue rechazada.'
  return 'Solicitud enviada. Queda pendiente de revisión administrativa.'
}

export function PropertyVerificationPanel({ propertyId, userId }: { propertyId: string; userId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [request, setRequest] = useState<VerificationRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [documentType, setDocumentType] = useState('ownership_title')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded || request) return

    let active = true
    setLoading(true)
    const loadRequest = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('property_verification_requests')
          .select('status,rejection_reason,created_at')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!active) return
        if (queryError) {
          setError('La verificación documental aún no está disponible en este entorno.')
          return
        }
        setRequest((data as VerificationRequest | null) ?? null)
      } catch (reason) {
        if (active) setError('No se pudo consultar el estado de verificación.')
        logSafeEvent({ module: 'property_verification', action: 'load_request', level: 'error', code: sanitizeErrorReason(reason) })
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadRequest()

    return () => {
      active = false
    }
  }, [expanded, propertyId, request])

  async function handleSubmit() {
    setError(null)
    setSuccess(null)
    if (!file) {
      setError('Selecciona un documento antes de enviarlo.')
      return
    }
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
      setError('Usa PDF, JPG, PNG o WEBP de hasta 10 MB.')
      return
    }

    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(-120)
    const path = `${userId}/property-${propertyId}/${crypto.randomUUID()}-${safeName}`
    setSubmitting(true)

    try {
      const { error: uploadError } = await supabase.storage
        .from('property_documents')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { error: requestError } = await supabase.rpc('submit_property_verification', {
        p_property_id: propertyId,
        p_document_type: documentType,
        p_document_path: path,
        p_notes: notes.trim() || null,
      })
      if (requestError) {
        await supabase.storage.from('property_documents').remove([path])
        throw requestError
      }

      setRequest({ status: 'pending', rejection_reason: null, created_at: new Date().toISOString() })
      setFile(null)
      setNotes('')
      setSuccess('Solicitud enviada.')
    } catch (reason) {
      logSafeEvent({ module: 'property_verification', action: 'submit_request', level: 'error', code: sanitizeErrorReason(reason) })
      setError('No se pudo enviar la solicitud. El archivo temporal fue retirado si llegó a subirse.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <h4 className="text-sm font-bold text-neutral-900">Verificación documental</h4>
            <p className="mt-1 text-xs leading-relaxed text-neutral-600">Revisión privada y administrativa. No es una certificación legal.</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label={expanded ? 'Cerrar verificación documental' : 'Solicitar verificación documental'} onClick={() => setExpanded((current) => !current)}>
          {expanded ? <X /> : <Upload />}
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-emerald-100 pt-4">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-emerald-700" aria-label="Cargando estado" />}
          {request && <p className="rounded-lg bg-white p-3 text-xs text-neutral-700">{statusCopy(request)}</p>}
          {(!request || request.status === 'rejected') && !loading && (
            <>
              <label className="block text-xs font-semibold text-neutral-700">
                Tipo de documento
                <select className="mt-1 flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                  <option value="ownership_title">Título o documento de propiedad</option>
                  <option value="purchase_contract">Contrato de compraventa</option>
                  <option value="other">Otro documento de respaldo</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-neutral-700">
                Archivo privado
                <Input className="mt-1 h-auto py-2" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              </label>
              <label className="block text-xs font-semibold text-neutral-700">
                Nota para revisión (opcional)
                <textarea className="mt-1 min-h-20 w-full rounded-md border border-neutral-200 bg-white p-3 text-sm" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} />
              </label>
              <Button type="button" className="w-full" onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <Upload />}
                Enviar a revisión
              </Button>
            </>
          )}
          {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
          {success && <p role="status" className="text-xs font-semibold text-emerald-700">{success}</p>}
        </div>
      )}
    </div>
  )
}
