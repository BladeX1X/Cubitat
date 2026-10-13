import { useState } from 'react'
import { ChevronDown, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { fetchPropertyTrustScore, type PropertyTrustScore } from './trustScoreRepository'

type Props = { propertyId: string }

function Factor({ label, value }: { label: string; value: string }) {
  return <span className="rounded-full bg-white/80 px-2.5 py-1">{label} {value}</span>
}

export function TrustScoreDisclosure({ propertyId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState<PropertyTrustScore | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadScore() {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchPropertyTrustScore(propertyId)
      if (!result) throw new Error('No se encontró el indicador de confianza para esta propiedad.')
      setScore(result)
    } catch {
      setError('No se pudo calcular el indicador de confianza.')
    } finally {
      setLoading(false)
    }
  }

  function toggle() {
    const nextExpanded = !expanded
    setExpanded(nextExpanded)
    if (nextExpanded && !score && !loading) void loadScore()
  }

  return (
    <div className="mt-2 rounded-xl border border-sky-100 bg-sky-50/70 p-3">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-between px-1 py-1 text-left text-xs font-bold text-sky-900 hover:bg-sky-100/70"
        aria-expanded={expanded}
        onClick={toggle}
      >
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{expanded ? 'Ocultar indicador interno' : 'Ver indicador interno'}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </Button>
      {expanded && (
        <div className="mt-2 border-t border-sky-100 pt-3" aria-live="polite">
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-sky-800"><Loader2 className="h-4 w-4 animate-spin" />Calculando indicador…</p>
          ) : error ? (
            <div role="alert" className="space-y-2 text-xs text-red-700">
              <p>{error}</p>
              <Button type="button" variant="outline" className="h-8 border-red-200 bg-white px-3 text-xs text-red-700" onClick={() => void loadScore()}>Reintentar</Button>
            </div>
          ) : score ? (
            <div aria-label="Indicador interno de confianza" className="space-y-2 text-xs text-sky-900">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">Puntaje orientativo</p>
                <strong className="text-lg">{score.score}/100</strong>
              </div>
              <p className="text-sky-800">No es una certificación legal ni una garantía de la propiedad.</p>
              <div className="flex flex-wrap gap-1.5">
                <Factor label="Identidad" value={score.identity_verified ? 'verificada' : 'pendiente'} />
                <Factor label="Documento" value={score.document_verified ? 'verificado' : 'pendiente'} />
                <Factor label="Publicada" value={score.published ? 'sí' : 'no'} />
                <Factor label="Contacto" value={score.contact_present ? 'sí' : 'no'} />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
