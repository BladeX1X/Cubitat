import { useEffect, useState } from 'react'
import { ArrowLeft, Building2, Phone } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { VerificationBadge } from '../../modules/kyc/components/VerificationBadge'
import { fetchAgentProfile, fetchAgentProperties } from '../../modules/agents/agentRepository'
import type { AgentProfile, AgentPropertySummary } from '../../modules/agents/types'
import { useSEO } from '../../shared/hooks/useSEO'
import { getPropertyCoverImage } from '../../modules/properties/utils/images'

type AgentProfilePageProps = {
  agentId: string
  onBack: () => void
  onSelectProperty?: (propertyId: string) => void
}

export function AgentProfilePage({ agentId, onBack, onSelectProperty }: AgentProfilePageProps) {
  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [properties, setProperties] = useState<AgentPropertySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useSEO({
    title: agent ? `${agent.full_name} | Agente Cubitat` : 'Perfil de Agente Inmobiliario',
    description: agent?.bio || 'Conoce las propiedades y la experiencia inmobiliaria de este agente en Cubitat.',
  })

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setLoadError(false)
      setAgent(null)
      setProperties([])
      try {
        const [profileData, propData] = await Promise.all([
          fetchAgentProfile(agentId),
          fetchAgentProperties(agentId),
        ])
        if (!active) return
        setAgent(profileData)
        setProperties(propData)
      } catch {
        if (active) setLoadError(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [agentId])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center py-20">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-neutral-200 rounded-full mx-auto mb-4" />
          <div className="h-5 w-48 bg-neutral-200 rounded mx-auto mb-2" />
          <div className="h-4 w-32 bg-neutral-200 rounded mx-auto" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-neutral-800">No se pudo cargar el perfil</h2>
        <p className="text-neutral-500 mt-2 text-sm">Comprueba tu conexión e inténtalo nuevamente.</p>
        <Button onClick={onBack} className="mt-6 h-11 rounded-full bg-[#035f53] text-white">
          Volver
        </Button>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-neutral-800">Agente no encontrado</h2>
        <p className="text-neutral-500 mt-2 text-sm">El perfil que buscas no está disponible o ha sido retirado.</p>
        <Button onClick={onBack} className="mt-6 h-11 rounded-full bg-[#035f53] text-white">
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      {/* Header Bar */}
      <div className="bg-white border-b border-neutral-200/80 sticky top-0 z-10 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={onBack}
            className="-ml-2 flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
            Perfil Profesional
          </span>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Agent Card Header */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#035f53] to-[#024a41] text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md border-4 border-white">
              {agent.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  {agent.full_name}
                </h1>
                <VerificationBadge status={agent.verification_status} isAgent />
              </div>

              {agent.agency_name && (
                <p className="flex items-center gap-1.5 text-neutral-600 text-sm font-semibold mt-1">
                  <Building2 className="w-4 h-4 text-[#035f53]" />
                  <span>{agent.agency_name}</span>
                </p>
              )}

              {agent.bio && (
                <p className="text-neutral-600 text-sm mt-3 leading-relaxed max-w-2xl">
                  {agent.bio}
                </p>
              )}
            </div>
          </div>

          {agent.phone ? (
            <a
              href={`https://wa.me/${agent.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 self-stretch rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#20bd5a] sm:self-auto"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Contactar por WhatsApp</span>
            </a>
          ) : (
            <p className="text-sm text-neutral-500" role="status">
              Este agente no comparte su WhatsApp públicamente.
            </p>
          )}
        </section>

        {/* Portfolio / Active Listings */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900">
              Propiedades publicadas ({properties.length})
            </h2>
          </div>

          {properties.length === 0 ? (
            <div className="bg-white rounded-xl border border-neutral-100 p-12 text-center text-neutral-500">
              Este agente no tiene propiedades publicadas en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((prop) => (
                <button
                  type="button"
                  key={prop.id}
                  onClick={() => onSelectProperty?.(prop.id)}
                  disabled={!onSelectProperty}
                  className="bg-white text-left rounded-2xl border border-neutral-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer disabled:cursor-default group"
                >
                  <div className="h-48 bg-neutral-100 relative overflow-hidden">
                    {prop.coverImage ? (
                      <img
                      src={getPropertyCoverImage(prop.coverImage)}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm font-semibold">
                        Cubitat
                      </div>
                    )}
                    <span className="absolute top-3 right-3 bg-neutral-900/80 text-white font-bold text-xs px-2.5 py-1 rounded-md backdrop-blur-xs">
                      ${prop.priceUsd?.toLocaleString('en-US') || 0} USD
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-neutral-900 text-base line-clamp-1 group-hover:text-[#035f53] transition-colors">
                      {prop.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">{prop.location}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
